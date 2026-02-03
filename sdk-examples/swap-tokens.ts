import { IIntentSigner } from "@defuse-protocol/intents-sdk";
import { parseUnits } from "viem";
import { solverRelay } from "@defuse-protocol/internal-utils";
import { intentsSdk } from "./config/sdk";
import { getIntentsSigner } from "./config/signer";
import { getTokenById, Token } from "./get-tokens-list";

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
  const quoteParams = {
    defuse_asset_identifier_in: originAsset.intents_token_id,
    defuse_asset_identifier_out: destinationAsset.intents_token_id,
    exact_amount_in: amountIn,
    wait_ms: 2888,
  };
  const quoteResponse = await solverRelay.getQuote({
    config: {
      logBalanceSufficient: true,
    },
    quoteParams,
  });
  return quoteResponse;
};

/**
 * Sign and submit a swap intent based on a previously fetched quote,
 * then wait for settlement.
 */
export const submitSwap = async ({
  quote,
  signer,
}: {
  quote: solverRelay.Quote;
  signer: IIntentSigner;
}) => {
  intentsSdk.setIntentSigner(signer);
  const { intentHash } = await intentsSdk.signAndSendIntent({
    relayParams: () => {
      return {
        quoteHashes: [quote.quote_hash],
      };
    },
    intents: [
      {
        intent: "token_diff",
        diff: {
          [quote.defuse_asset_identifier_in]: `-${quote.amount_in}`, //token in to sell
          [quote.defuse_asset_identifier_out]: `${quote.amount_out}`, //token out to buy
        },
      },
    ],
  });

  const intentTx = await intentsSdk.waitForIntentSettlement({
    intentHash: intentHash,
  });
  return intentTx;
};

async function main() {
  const fromTokenId = process.argv[2] as string;
  const toTokenId = process.argv[3] as string;
  const amount = process.argv[4] as string;
  const quoteOnly = process.argv.includes("--quote-only");
  if (!fromTokenId || !toTokenId || !amount) {
    throw new Error(
      "Usage: swap-tokens <fromTokenId> <toTokenId> <amount> [--quote-only]"
    );
  }
  console.log("Requesting swap quote...");
  console.log(`From: ${fromTokenId}`);
  console.log(`To: ${toTokenId}`);
  console.log(`Amount in: ${amount}`);
  const fromToken = await getTokenById({
    intents_token_id: fromTokenId,
  });
  if (!fromToken) {
    throw new Error("Token not found");
  }
  const toToken = await getTokenById({
    intents_token_id: toTokenId,
  });
  if (!toToken) {
    throw new Error("Token not found");
  }
  const amountIn = parseUnits(amount, fromToken.decimals).toString();
  const quote = await getSwapQuote({
    originAsset: fromToken,
    destinationAsset: toToken,
    amountIn: amountIn,
  });
  console.log("\nQuote received:");
  console.dir(
    {
      quoteHash: quote.quote_hash,
      amountIn: quote.amount_in,
      amountOut: quote.amount_out,
      tokenIn: quote.defuse_asset_identifier_in,
      tokenOut: quote.defuse_asset_identifier_out,
    },
    { depth: null }
  );
  if (quoteOnly) {
    console.log("\nQuote-only mode enabled. Skipping swap submission.");
    return;
  }
  const { signer } = getIntentsSigner();
  if (!signer) {
    throw new Error("Signer not found");
  }
  const intentTx = await submitSwap({
    quote: quote,
    signer: signer,
  });
  console.log("\nSwap submitted. Settlement result:");
  console.log(JSON.stringify(intentTx, null, 2));
}

// Only run if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
