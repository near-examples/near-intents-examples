import {
  createInternalTransferRoute,
  IIntentSigner,
  RouteEnum,
} from "@defuse-protocol/intents-sdk";
import { intentsSdk } from "./config/sdk";
import { getIntentsSigner } from "./config/signer";
import { getTokenById, Token } from "./get-tokens-list";

/*
 * Example: internal transfer between intents accounts.
 */

/**
 * Transfer tokens internally between intents accounts using the internal route.
 * Returns the settlement transaction hash once confirmed.
 */
export const transferToken = async ({
  token,
  amount,
  toAddress,
  signer,
}: {
  token: Token;
  amount: string;
  toAddress: string;
  signer: IIntentSigner;
}) => {
  const withdrawalIntents = await intentsSdk.createWithdrawalIntents({
    withdrawalParams: {
      assetId: token.intents_token_id,
      amount: BigInt(amount),
      destinationAddress: toAddress,
      destinationMemo: undefined, // Destination memo is only used for XRP Ledger withdrawals
      feeInclusive: false,
      routeConfig: createInternalTransferRoute(),
    },
    feeEstimation: {
      amount: 0n,
      quote: null,
      underlyingFees: {
        [RouteEnum.InternalTransfer]: null,
      },
    },
  });

  intentsSdk.setIntentSigner(signer);

  const { intentHash } = await intentsSdk.signAndSendIntent({
    intents: withdrawalIntents,
  });

  const { hash } = await intentsSdk.waitForIntentSettlement({ intentHash });
  return {
    txHash: hash,
  };
};

async function main() {
  const token = await getTokenById({
    intents_token_id: process.argv[2] as string,
  });
  if (!token) {
    throw new Error("Token not found");
  }
  const amount = process.argv[3] as string;
  const toAddress = process.argv[4] as string;
  console.log("Preparing internal transfer...");
  console.log(`Token: ${token.intents_token_id}`);
  console.log(`Amount: ${amount}`);
  console.log(`To: ${toAddress}`);
  const { signer } = getIntentsSigner();
  if (!signer) {
    throw new Error("Signer not found");
  }
  const txHash = await transferToken({
    token: token,
    amount: amount,
    toAddress: toAddress,
    signer: signer,
  });
  console.log("Transfer submitted:");
  console.log(JSON.stringify(txHash, null, 2));
}

// Only run if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
