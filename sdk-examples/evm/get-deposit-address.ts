import {
  authIdentity,
  type AuthMethod,
  poaBridge,
} from '@defuse-protocol/internal-utils';
import { fileURLToPath } from 'node:url';
import { assetNetworkAdapter } from './chains';
import { getEvmIntentsSigner } from './config';
import { getTokenById, Token } from './get-tokens-list';

/**
 *  Get Deposit Address
 *
 *  Requests a deposit address from the POA bridge for a specific token.
 *  Once you receive the deposit address, you can send tokens from any
 *  external wallet on the token's native chain to fund your intents account.
 *
 *  The deposit mode depends on the blockchain:
 *   - SIMPLE: most chains (EVM, NEAR, Bitcoin, Solana, etc.)
 *   - MEMO:   Stellar (requires a memo to identify the recipient)
 *
 *  The response contains:
 *   - address: the deposit address on the token's native chain
 *   - memo:    (Stellar only) the memo to include in the transaction
 *
 */

/**
 * Determine the deposit mode for a given blockchain.
 * Stellar requires a MEMO-based deposit; all other chains use SIMPLE.
 */
const getDepositMode = (blockchain: string) => {
  switch (blockchain) {
    case 'stellar':
      return 'MEMO';
    default:
      return 'SIMPLE';
  }
};

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
    // Derive the intents-internal account ID from auth credentials
    const account_id = authIdentity.authHandleToIntentsUserId(
      authIdentifier,
      authMethod,
    );

    // Request a deposit address from the POA bridge API
    const quoteResponse = await poaBridge.httpClient.getDepositAddress({
      account_id,
      chain: assetNetworkAdapter[token.blockchain],
      deposit_mode: getDepositMode(token.blockchain),
    });

    if (!quoteResponse.address) {
      throw new Error('Deposit address not found');
    }
    memo = quoteResponse.memo ?? null;
    depositAddress = quoteResponse.address;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to get deposit address');
  }

  return {
    address: depositAddress,
    memo: memo,
  };
}

// Example: get the deposit address for wrapped NEAR
const tokenId = 'nep141:wrap.near';

async function main() {
  // Resolve the signer from environment variables (NEAR or EVM private key)
  const { authIdentifier, authMethod } = getEvmIntentsSigner();

  console.log('Fetching deposit address...');

  // Look up the token by its intents asset ID
  const token = await getTokenById({
    intents_token_id: tokenId,
  });
  console.log('Token:', token);
  if (!token) {
    throw new Error('Token not found');
  }

  const depositAddress = await getDepositAddress({
    authIdentifier,
    authMethod,
    token,
  });
  console.log(`Token: ${token.assetId}`);
  console.log(`Deposit Address: ${depositAddress.address}`);
  if (depositAddress.memo) {
    console.log(`Memo: ${depositAddress.memo}`);
  }
}

// Only run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
