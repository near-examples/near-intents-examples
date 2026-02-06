import {
  authIdentity,
  AuthMethod,
  solverRelay,
} from '@defuse-protocol/internal-utils';
import {
  OneClickService,
  QuoteRequest,
  QuoteResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { base64 } from '@scure/base';
import { Account } from 'near-api-js';
import { parseUnits } from 'viem';
import { signEvmIntentForPublish, WalletClient } from './config/evm';
import { signNearIntentForPublish } from './config/near';
import { intentsSdk } from './config/sdk';
import { getIntentsSigner } from './config/signer';
import { getTokenById, Token } from './get-tokens-list';
import { createTransferMessage } from './utils/messages';
import { convertPublishIntentToLegacyFormat } from './utils/intent';

/*
 * Example: fetch a swap quote and submit a swap intent.
 */

/**
 * Request a swap quote for a token pair and exact input amount.
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
  const { authIdentifier } = getIntentsSigner();

  const deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + 60 * 20);

  const quoteResponse = await OneClickService.getQuote({
    deadline: deadline.toISOString(),
    recipient: authIdentifier,
    recipientType: QuoteRequest.recipientType.INTENTS,
    refundTo: authIdentifier,
    refundType: QuoteRequest.refundType.INTENTS,

    depositType: QuoteRequest.depositType.INTENTS,
    dry: false,
    slippageTolerance: 100,

    swapType: QuoteRequest.swapType.EXACT_INPUT,
    originAsset: originAsset.near_token_id,
    destinationAsset: destinationAsset.near_token_id,
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
  account: Account | WalletClient;
  authIdentifier: string;
  authMethod: AuthMethod;
}) => {
  try {
    const { nonce, deadline } = await intentsSdk
      .intentBuilder()
      .setDeadline(new Date(quote.quote.deadline ?? ''))
      .build();

    const tokenInAssetId = quote.quoteRequest.originAsset;
    const signerId = authIdentity.authHandleToIntentsUserId(
      authIdentifier,
      authMethod,
    );
    const walletMessage = createTransferMessage(
      [[tokenInAssetId, BigInt(quote.quoteRequest.amount)]], // tokenDeltas
      {
        signerId,
        receiverId: quote.quote.depositAddress as string, // receiver (deposit address from 1CS)
        deadlineTimestamp: Date.parse(deadline),
        nonce: base64.decode(nonce),
      },
    );

    const signatureIntent =
      authMethod === AuthMethod.Near
        ? await signNearIntentForPublish({
            account: account as Account,
            walletMessage,
          })
        : await signEvmIntentForPublish({
            account: account as WalletClient,
            walletMessage,
          });

    const publishResult = await solverRelay
      .publishIntent(
        signatureIntent,
        { userAddress: authIdentifier, userChainType: authMethod },
        [],
      )
      .then(convertPublishIntentToLegacyFormat);

    if (publishResult.tag === 'err') {
      throw new Error(publishResult.value.reason);
    }

    const { hash } = await intentsSdk.waitForIntentSettlement({
      intentHash: publishResult.value,
    });

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

async function main() {
  const fromTokenId = process.argv[2] as string;
  const toTokenId = process.argv[3] as string;
  const amount = process.argv[4] as string;
  const quoteOnly = process.argv.includes('--quote-only');
  if (!fromTokenId || !toTokenId || !amount) {
    throw new Error(
      'Usage: swap-tokens <fromTokenId> <toTokenId> <amount> [--quote-only]',
    );
  }
  console.log('Requesting swap quote...');
  console.log(`From: ${fromTokenId}`);
  console.log(`To: ${toTokenId}`);
  console.log(`Amount in: ${amount}`);
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
  const amountIn = parseUnits(amount, fromToken.decimals).toString();
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
  const { account, authIdentifier, authMethod } = getIntentsSigner();
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
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
