import type { utils } from "@defuse-protocol/internal-utils";
import { queryContract } from "./get-balances";
import { Account } from "near-api-js";

export async function addPublicKeyToContract({
  account,
}: {
  account: Account;
}) {
  return await account.signAndSendTransaction({
    receiverId: "near.intents",
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "add_public_key",
          args: { public_key: publicKey },
          gas: "5000000000000",
          deposit: "1",
        },
      },
    ],
  });
}

export async function hasPublicKey({
  accountId,
  publicKey,
}: {
  accountId: string;
  publicKey: string;
} & utils.OptionalBlockReference): Promise<boolean> {
  const data = await queryContract({
    contractId: "near-intents",
    methodName: "has_public_key",
    args: {
      account_id: accountId,
      public_key: publicKey,
    },
  });

  return data as boolean;
}
