import { WithdrawalParams } from "@defuse-protocol/intents-sdk";
import { intentsSdk } from "./config/sdk";
import { getTokenById, Token } from "./get-tokens-list";

/*
 * Example: estimate a withdrawal fee and submit a withdrawal.
 */

/**
 * Estimate withdrawal fees for a given token/amount and destination.
 */
export const getWithdrawalQuote = async ({
  fromToken,
  amount,
  destinationAddress,
  destinationMemo,
}: {
  fromToken: Token;
  amount: string;
  destinationAddress: string;
  destinationMemo?: string;
}) => {
  const estimatedWithdrawalFee = await intentsSdk.estimateWithdrawalFee({
    withdrawalParams: {
      assetId: fromToken.intents_token_id,
      amount: BigInt(amount),
      destinationAddress,
      feeInclusive: true,
      destinationMemo,
    },
  });
  return estimatedWithdrawalFee;
};

/**
 * Submit a withdrawal based on prepared parameters and wait for settlement.
 */
export const submitWithdrawal = async ({
  withdrawalParams,
}: {
  withdrawalParams: WithdrawalParams;
}) => {
  const withdrawal = await intentsSdk.processWithdrawal({
    withdrawalParams,
  });

  const intentTx = await intentsSdk.waitForIntentSettlement({
    intentHash: withdrawal.intentHash,
  });
  return intentTx;
};

async function main() {
  const token = await getTokenById({
    intents_token_id: process.argv[2] as string,
  });
  if (!token) {
    throw new Error("Token not found");
  }
  const amount = process.argv[3] as string;
  const destinationAddress = process.argv[4] as string;
  const destinationMemo = process.argv[5] as string;
  const withdrawalQuoteOnly = process.argv.includes("--quote-only");
  console.log("Preparing withdrawal...");
  console.log(`Token: ${token.intents_token_id}`);
  console.log(`Amount: ${amount}`);
  console.log(`Destination: ${destinationAddress}`);
  const withdrawalQuote = await getWithdrawalQuote({
    fromToken: token,
    amount: amount,
    destinationAddress: destinationAddress,
    destinationMemo: destinationMemo,
  });
  if (withdrawalQuoteOnly) {
    console.log("\nWithdrawal fee quote:");
    console.log(JSON.stringify(withdrawalQuote, null, 2));
    return;
  }

  const intentTx = await submitWithdrawal({
    withdrawalParams: {
      assetId: token.intents_token_id,
      amount: BigInt(amount),
      destinationAddress: destinationAddress,
      feeInclusive: true,
      destinationMemo: destinationMemo,
    },
  });
  console.log("\nWithdrawal submitted. Settlement result:");
  console.log(JSON.stringify(intentTx, null, 2));
}

// Only run if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
