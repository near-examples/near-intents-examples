/**
 *  Swap Tokens (NEAR Signer)
 *
 *  Swaps tokens inside the intents system using a NEAR wallet (NEP-413 signing).
 *  Tokens must already be deposited into your intents account before swapping.
 *
 *  Why swap inside intents?
 *  -----------------------
 *  Instead of swapping on a DEX on each chain (paying gas, dealing with slippage, bridging),
 *  NEAR Intents lets you swap any token pair across any chain in a single signed message.
 *  Solvers compete to fill your order at the best price — you just sign and wait.
 *
 *  Swap flow:
 *   1. Request a quote from the 1-Click API with deposit/recipient/refund all set to INTENTS
 *      (tokens stay inside the intents system, no external bridging needed)
 *   2. Build an inner-transfer message that authorizes moving your tokens to the solver
 *   3. Sign the message with your NEAR wallet using NEP-413 (off-chain message signing)
 *   4. Publish the signed intent to the solver relay network
 *   5. Wait for on-chain settlement — solver fills the order and you receive destination tokens
 *
 *  NEP-413 vs ERC-191:
 *  This script uses NEP-413 (NEAR's off-chain signing standard) instead of ERC-191.
 *  The swap logic is identical — only the signature format and wallet interaction differ.
 *  Use this script with a NEAR private key; use swap-tokens-evm.ts with an EVM private key.
 *
 *  Set `quoteOnly = true` to preview the quote without executing the swap.
 *
 *  Configure the variables below:
 *   - `fromTokenId` — source token assetId (e.g. "nep141:arb-0xaf88...831.omft.near")
 *   - `toTokenId`   — destination token assetId (e.g. "nep141:wrap.near")
 *   - `amount`      — human-readable amount of the source token
 *
 *  Requires:  INTENTS_SDK_PRIVATE_KEY_NEAR in .env
 *  Run:       pnpm sdk/swap-tokens-near
 *
 */

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
import { getTokenById, Token } from './get-tokens-list';
import { intentsSdk } from './utils/config';
import { getNearIntentsSigner } from './utils/near-config';

/**
 * Request a swap quote from the 1-Click API.
 * All addresses are set to INTENTS — tokens move within the intents ledger, not on external chains.
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
  const { authIdentifier } = await getNearIntentsSigner();

  // Set a generous deadline for the quote (20 minutes)
  const deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + 60 * 20);

  const quoteResponse = await OneClickService.getQuote({
    deadline: deadline.toISOString(), // Quote expires after this time
    recipient: authIdentifier, // Swapped tokens go back to your intents account
    recipientType: QuoteRequest.recipientType.INTENTS, // Recipient is inside intents (not external chain)
    refundTo: authIdentifier, // If swap fails, refund to your intents account
    refundType: QuoteRequest.refundType.INTENTS, // Refund stays inside intents
    depositType: QuoteRequest.depositType.INTENTS, // Source tokens are already inside intents
    dry: false, // Live quote (not a dry run)
    slippageTolerance: 100, // Max slippage: 100 basis points = 1.00%
    swapType: QuoteRequest.swapType.EXACT_INPUT, // Fixed input amount, output varies
    originAsset: originAsset.assetId, // Source token asset ID
    destinationAsset: destinationAsset.assetId, // Destination token asset ID
    amount: amountIn, // Amount in smallest unit of the source token
  });
  return quoteResponse;
};

/**
 * Execute the swap by signing with the NEAR wallet and publishing to the solver relay.
 *
 * The signing flow for NEAR:
 *  1. Build a nonce + deadline from the intent builder
 *  2. Construct an inner-transfer message (authorizes token movement)
 *  3. Wrap it in a swap message formatted for NEP-413 signing
 *  4. Sign with the NEAR wallet (signNep413Message)
 *  5. Publish to the solver relay — solvers compete to fill your order
 *  6. Wait for settlement
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
    // Get a unique nonce and deadline from the intent builder
    // The nonce prevents replay attacks; the deadline ensures the intent expires
    const { nonce, deadline } = await intentsSdk
      .intentBuilder()
      .setDeadline(new Date(quote.quote.deadline ?? ''))
      .build();

    const tokenInAssetId = quote.quoteRequest.originAsset;

    // Derive the intents-internal signer ID from the NEAR account
    const signerId = authIdentity.authHandleToIntentsUserId(
      authIdentifier,
      authMethod,
    );

    // Build the inner-transfer message — this authorizes the intents contract
    // to move your tokens from your account to the solver's deposit address
    const innerMessage = messageFactory.makeInnerTransferMessage({
      tokenDeltas: [[tokenInAssetId, BigInt(quote.quoteRequest.amount)]], // [token, amount] pairs to transfer
      signerId, // Your intents-internal account ID
      deadlineTimestamp: Date.parse(deadline), // Intent expiration (milliseconds)
      receiverId: quote.quote.depositAddress as string, // Solver's deposit address (from quote)
      memo: undefined, // Optional memo
    });

    // Wrap the inner message into the NEP-413 format that NEAR wallets can sign
    const walletMessage = messageFactory.makeSwapMessage({
      innerMessage,
      nonce: base64.decode(nonce), // Unique nonce as raw bytes
    });

    // Sign with the NEAR wallet using NEP-413 (off-chain message signing standard)
    // NEP-413 includes: message, nonce, recipient — all verified by the intents contract
    const signatureIntent = await account.signNep413Message({
      message: walletMessage.NEP413.message, // The human-readable message to sign
      nonce: walletMessage.NEP413.nonce, // Unique nonce (prevents replay)
      recipient: walletMessage.NEP413.recipient, // Intended recipient contract (intents.near)
    });

    // Publish the signed intent to the solver relay network
    // Solvers see your order and compete to fill it at the best price
    const publishResult = await solverRelay.publishIntent(
      {
        type: 'NEP413', // Signature type — tells the verifier to use NEP-413 validation
        signatureData: {
          accountId: signatureIntent.accountId, // Your NEAR account ID
          publicKey: signatureIntent.publicKey.toString(), // Public key that signed (ed25519:...)
          signature: base64.encode(signatureIntent.signature), // Base64-encoded ed25519 signature
        },
        signedData: walletMessage.NEP413, // The NEP-413 payload that was signed
      },
      { userAddress: authIdentifier, userChainType: authMethod }, // Your identity for the solver
      [], // Additional solver hints (empty = use defaults)
    );
    if (publishResult.isErr()) {
      throw new Error(publishResult.unwrapErr().message);
    }

    // Wait for a solver to fill the order and the intent to settle on-chain
    const { hash } = await intentsSdk.waitForIntentSettlement({
      intentHash: publishResult.unwrap(),
    });

    // Notify the 1-Click API about the settlement (for tracking/analytics)
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

// ── Configuration ──────────────────────────────────────────────────────────────
const fromTokenId =
  'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near'; // $USDC on Arbitrum
const toTokenId = 'nep141:wrap.near'; // Native $NEAR
const amount = '0.5'; // Human-readable amount of the source token
const quoteOnly = false; // Set to true to preview quote without executing

async function main() {
  console.log('Requesting swap quote...');
  console.log(`From: ${fromTokenId}`);
  console.log(`To: ${toTokenId}`);
  console.log(`Amount in: ${amount}`);

  // Look up both tokens from the registry
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

  // Convert human-readable amount to smallest unit using source token's decimals
  const amountIn = parseUnits(amount, fromToken.decimals).toString();

  // Request a swap quote — solvers return pricing in real time
  const quote = await getSwapQuote({
    originAsset: fromToken,
    destinationAsset: toToken,
    amountIn,
  });
  console.log('\nQuote received:');
  console.dir(quote.quote, { depth: null });

  if (quoteOnly) {
    console.log('\nQuote-only mode enabled. Skipping swap submission.');
    return;
  }

  // Get the NEAR wallet client and signer context
  const { walletClient, authIdentifier, authMethod } =
    await getNearIntentsSigner();

  // Execute the swap: sign → publish → wait for settlement
  const intentTx = await submitSwap({
    quote,
    account: walletClient.account,
    authIdentifier,
    authMethod,
  });
  console.log('\nSwap submitted. Settlement result:');
  console.log(JSON.stringify(intentTx, null, 2));
}

// Only run when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
