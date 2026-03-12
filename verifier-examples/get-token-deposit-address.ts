/**
 *  Get Token Deposit Address
 *
 *  Requests a chain-specific deposit address that you can use to fund your intents account.
 *  Send tokens from any external wallet to this address and they will appear in your
 *  intents balance after on-chain confirmation.
 *
 *  Why deposit addresses?
 *  ---------------------
 *  The intents system lives on NEAR, but you can deposit from any supported chain
 *  (Ethereum, Arbitrum, Solana, Bitcoin, etc.). The POA bridge generates a unique
 *  deposit address on the source chain that is linked to your intents account.
 *  Any tokens sent to this address are automatically bridged and credited.
 *
 *  How it works:
 *   1. Derives your intents-internal account ID
 *   2. Looks up the token to determine which blockchain network to use
 *   3. Calls the POA bridge to generate a unique deposit address
 *   4. For some chains (e.g. Stellar), a memo is also returned — you must include it
 *
 *  The deposit address is reusable — you can send multiple deposits to the same address.
 *
 *  Configure the `tokenId` variable below to change which token/chain you want to deposit.
 *
 *  Run:  pnpm sdk/get-token-deposit-address
 *
 */

import {
  authIdentity,
  type AuthMethod,
  poaBridge,
} from '@defuse-protocol/internal-utils';
import { fileURLToPath } from 'node:url';
import { getTokenById, Token } from './get-tokens-list';
import { assetNetworkAdapter } from './utils/chains';
import { getSigner } from './utils/signer';

/**
 * Determine the deposit mode for a given blockchain.
 * Most chains use SIMPLE (just an address), but Stellar requires MEMO
 * (a shared address + unique memo to identify the depositor).
 */
const getDepositMode = (blockchain: string) => {
  switch (blockchain) {
    case 'stellar':
      return 'MEMO';
    default:
      return 'SIMPLE';
  }
};

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
    // Convert wallet address → intents-internal account ID
    const account_id = authIdentity.authHandleToIntentsUserId(
      authIdentifier,
      authMethod,
    );

    // Request a deposit address from the POA (Proof of Authority) bridge
    // The bridge maps your intents account to a unique address on the source chain
    const quoteResponse = await poaBridge.httpClient.getDepositAddress({
      account_id, // Your intents-internal account ID (tokens will be credited here)
      chain: assetNetworkAdapter[token.blockchain], // Target chain enum (e.g. BlockchainEnum.NEAR)
      deposit_mode: getDepositMode(token.blockchain), // SIMPLE for most chains, MEMO for Stellar
    });

    if (!quoteResponse.address) {
      throw new Error('Deposit address not found');
    }
    memo = quoteResponse.memo ?? null; // Memo is only present for MEMO-mode chains (e.g. Stellar)
    depositAddress = quoteResponse.address;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to get deposit address');
  }

  return {
    address: depositAddress,
    memo,
  };
}

// ── Configuration ──────────────────────────────────────────────────────────────
// Change this to any supported token assetId (see get-tokens-list.ts for options)
const tokenId = 'nep141:wrap.near'; // Native $NEAR — deposit address will be on NEAR chain

async function main() {
  // Auto-detect signer type (NEAR or EVM) based on which .env key is set
  const { authIdentifier, authMethod } = await getSigner();

  console.log('Fetching deposit address...');

  // Look up full token metadata from the registry
  const token = await getTokenById({
    intents_token_id: tokenId,
  });
  console.log('Token:', token);
  if (!token) {
    throw new Error('Token not found');
  }

  // Request the deposit address for this token's native chain
  const depositAddress = await getDepositAddress({
    authIdentifier,
    authMethod,
    token,
  });
  console.log(`Token: ${token.assetId}`);
  console.log(`Deposit Address: ${depositAddress.address}`);
  if (depositAddress.memo) {
    console.log(`Memo: ${depositAddress.memo}`); // Include this memo in your transaction if present
  }
}

// Only run when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
