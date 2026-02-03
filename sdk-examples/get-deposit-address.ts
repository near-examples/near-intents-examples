import {
  type AuthMethod,
  authIdentity,
  poaBridge,
} from "@defuse-protocol/internal-utils";
import { getIntentsSigner } from "./config/signer";
import { getTokenById, Token } from "./get-tokens-list";

/*
 * Example: request a deposit address for a token and auth identity.
 */

/**
 * Request a deposit address for a given token and user.
 * Some chains (e.g. Stellar) require a memo, which is returned when present.
 */
export async function getDepositAddress({
  authIdentifier,
  authMethod,
  token,
}: {
  authIdentifier: string;
  authMethod: AuthMethod;
  token: Token;
}) {
  let depositAddress: string;
  let memo: string | null;
  try {
    const account_id = authIdentity.authHandleToIntentsUserId(
      authIdentifier,
      authMethod
    );

    // Defuse asset identifier is in the format of blockchain:type
    const [blockchain, type] = token.defuse_asset_identifier.split(":");

    // If the token is a Stellar token, use the MEMO deposit mode, otherwise use the SIMPLE deposit mode
    const depositMode = token.defuse_asset_identifier.includes("stellar")
      ? "MEMO"
      : "SIMPLE";

    const quoteResponse = await poaBridge.httpClient.getDepositAddress({
      account_id,
      chain: `${blockchain}:${type}`,
      deposit_mode: depositMode,
    });

    if (!quoteResponse.address) {
      throw new Error("Deposit address not found");
    }
    memo = quoteResponse.memo ?? null;
    depositAddress = quoteResponse.address;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get deposit address");
  }

  return {
    address: depositAddress,
    memo: memo,
  };
}

async function main() {
  const { authIdentifier, authMethod } = getIntentsSigner();
  console.log("Fetching deposit address...");
  if (!process.argv[2]) {
    throw new Error("Usage: get-deposit-address <tokenId>");
  }
  const token = await getTokenById({
    intents_token_id: process.argv[2] as string,
  });
  console.log("Token:", token);
  if (!token) {
    throw new Error("Token not found");
  }
  const depositAddress = await getDepositAddress({
    authIdentifier,
    authMethod,
    token,
  });
  console.log(`Token: ${token.intents_token_id}`);
  console.log(`Deposit Address: ${depositAddress.address}`);
  if (depositAddress.memo) {
    console.log(`Memo: ${depositAddress.memo}`);
  }
}

// Only run if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
