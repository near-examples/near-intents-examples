import {
  authIdentity,
  AuthMethod,
  messageFactory,
  solverRelay,
} from '@defuse-protocol/internal-utils';
import {
  OneClickService,
  QuoteRequest,
  QuoteResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { base64 } from '@scure/base';
import { Account } from 'near-api-js';
import { fileURLToPath } from 'node:url';
import { parseUnits } from 'viem';
import { getIntentsSignerNear, intentsSdk } from './config';
import { getTokenById, Token } from './get-tokens-list';

/**
 *  Swap Tokens
 *
 *  Performs an internal token swap within the NEAR Intents system.
 *  Tokens must already be deposited into your intents account before swapping.
 *
 *  Intent lifecycle:
 *   1. Request a swap quote from the 1-Click API (`/quote` endpoint)
 *      - depositType is set to INTENTS (tokens are already inside the system)
 *      - recipient and refund are both set to the intents account
 *   2. Build and sign an intent message using the quote's deposit address
 *   3. Publish the signed intent to the solver relay — an off-chain order book
 *      where competing solvers bid to fill your intent at the best price
 *   4. A solver picks up the intent and settles it on-chain
 *   5. Submit the settlement tx hash to the 1-Click API for tracking
 *
 *  The signed message contains "token deltas" — the amounts you're willing to
 *  give up. The solver provides the other side of the trade. Because solvers
 *  compete, you generally get better prices than a single DEX.
 *
 *  Supports both NEAR (NEP-413) and EVM (ERC-191) signing.
 *  Set `quoteOnly = true` to preview the quote without executing the swap.
 *
 */

/**
 * Request a swap quote for a token pair and exact input amount.
 * The quote is configured for an internal (INTENTS) deposit, meaning the
 * tokens are already inside the intents system.
 */
export const getSwapQuote = async ({
  originAsset,
  destinationAsset,
  amountIn,
}: {
  originAsset: Token;
  destinationAsset: Token;
  amountIn: string;
}) => {
  const { authIdentifier } = getIntentsSignerNear();

  // Quote expires 20 minutes from now
  const deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + 60 * 20);

  // Fetch quote from 1-Click API `/quote` endpoint
  const quoteResponse = await OneClickService.getQuote({
    // Quote expiration in ISO format
    deadline: deadline.toISOString(),

    // Recipient and refund both point to the intents account (internal swap)
    recipient: authIdentifier,
    recipientType: QuoteRequest.recipientType.INTENTS,
    refundTo: authIdentifier,
    refundType: QuoteRequest.refundType.INTENTS,

    // INTENTS deposit type: tokens are already inside the intents system
    depositType: QuoteRequest.depositType.INTENTS,
    dry: false,

    // Maximum acceptable slippage as basis points (100 = 1.00%)
    slippageTolerance: 100,

    // EXACT_INPUT: input amount is fixed, output varies
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    originAsset: originAsset.assetId,
    destinationAsset: destinationAsset.assetId,
    amount: amountIn,
  });
  return quoteResponse;
};

/**
 * Sign and submit a swap intent based on a previously fetched quote,
 * then wait for settlement.
 */
export const submitSwap = async ({
  quote,
  account,
  authIdentifier,
  authMethod,
}: {
  quote: QuoteResponse;
  account: Account;
  authIdentifier: string;
  authMethod: AuthMethod;
}) => {
  try {
    // Build intent nonce and deadline from the SDK
    const { nonce, deadline } = await intentsSdk
      .intentBuilder()
      .setDeadline(new Date(quote.quote.deadline ?? ''))
      .build();

    const tokenInAssetId = quote.quoteRequest.originAsset;
    const signerId = authIdentity.authHandleToIntentsUserId(
      authIdentifier,
      authMethod,
    );

    const innerMessage = messageFactory.makeInnerTransferMessage({
      tokenDeltas: [[tokenInAssetId, BigInt(quote.quoteRequest.amount)]],
      signerId: signerId,
      deadlineTimestamp: Date.parse(deadline), // or Date.now() + 5 * 60 * 1000
      receiverId: quote.quote.depositAddress as string, // deposit address from the quote
      memo: undefined,
    });

    const walletMessage = messageFactory.makeSwapMessage({
      innerMessage,
      nonce: base64.decode(nonce),
    });

    // Sign the intent using the appropriate method (NEAR NEP-413 or EVM ERC-191)
    const signatureIntent = await account.signNep413Message({
      message: walletMessage.NEP413.message,
      nonce: walletMessage.NEP413.nonce,
      recipient: walletMessage.NEP413.recipient,
    });

    // Publish the signed intent to the solver relay (off-chain order book).
    // Solvers compete to fill the intent — no on-chain tx happens until settlement.
    const publishResult = await solverRelay.publishIntent(
      {
        type: 'NEP413',
        signatureData: {
          accountId: signatureIntent.accountId,
          publicKey: signatureIntent.publicKey.toString(),
          signature: base64.encode(signatureIntent.signature),
        },
        signedData: walletMessage.NEP413,
      },
      { userAddress: authIdentifier, userChainType: authMethod },
      [],
    );
    if (publishResult.isErr()) {
      throw new Error(publishResult.unwrapErr().message);
    }

    // Wait for the intent to settle on-chain
    const { hash } = await intentsSdk.waitForIntentSettlement({
      intentHash: publishResult.unwrap(),
    });

    // Submit the settlement tx hash to the 1-Click API for tracking
    const depositResponse = await OneClickService.submitDepositTx({
      txHash: hash,
      depositAddress: quote.quote.depositAddress as string,
    });
    return {
      depositResponse,
      txHash: hash,
    };
  } catch (error) {
    console.error('Error submitting one click quote:', error);
    throw error;
  }
};

// Example Swap Configuration
const fromTokenId =
  'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near'; // USDC on Arbitrum
const toTokenId = 'nep141:wrap.near'; // Wrapped NEAR
const amount = '0.5'; // Human-readable amount (will be converted to smallest unit)
const quoteOnly = false; // Set to true to preview the quote without executing the swap

async function main() {
  console.log('Requesting swap quote...');
  console.log(`From: ${fromTokenId}`);
  console.log(`To: ${toTokenId}`);
  console.log(`Amount in: ${amount}`);

  // Look up token metadata for both sides of the swap
  const fromToken = await getTokenById({
    intents_token_id: fromTokenId,
  });
  if (!fromToken) {
    throw new Error('Token not found');
  }
  const toToken = await getTokenById({
    intents_token_id: toTokenId,
  });
  if (!toToken) {
    throw new Error('Token not found');
  }

  // Convert human-readable amount to smallest unit using token decimals
  const amountIn = parseUnits(amount, fromToken.decimals).toString();

  // Step 1: Get swap quote
  const quote = await getSwapQuote({
    originAsset: fromToken,
    destinationAsset: toToken,
    amountIn: amountIn,
  });
  console.log('\nQuote received:');
  console.dir(quote.quote, { depth: null });

  if (quoteOnly) {
    console.log('\nQuote-only mode enabled. Skipping swap submission.');
    return;
  }

  // Step 2: Sign and submit the swap intent
  const { account, authIdentifier, authMethod } = getIntentsSignerNear();
  const intentTx = await submitSwap({
    quote,
    account,
    authIdentifier,
    authMethod,
  });
  console.log('\nSwap submitted. Settlement result:');
  console.log(JSON.stringify(intentTx, null, 2));
}

// Only run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
