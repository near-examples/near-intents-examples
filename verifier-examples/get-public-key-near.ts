/**
 *  Get Public Key Status (NEAR)
 *
 *  Checks whether your NEAR public key is registered with the `intents.near` verifier contract.
 *  A registered key is required before you can sign intents — if your key is not registered,
 *  run `add-public-key-near.ts` first.
 *
 *  Why key registration?
 *  --------------------
 *  The `intents.near` contract needs to know which public keys are authorized to act on behalf
 *  of each account. When you sign an intent (swap, transfer, withdrawal), the contract verifies
 *  the signature against registered keys. Without registration, your signed intents will be rejected.
 *
 *  This is only required for NEAR signers — EVM signers use ecrecover (address is derived
 *  from the signature itself, so no pre-registration is needed).
 *
 *  What this script shows:
 *   - Your ed25519 public key (derived from the private key in .env)
 *   - The implicit account ID (hex-encoded public key, 64 chars)
 *   - All NEAR accounts associated with this key (via FastNEAR lookup)
 *   - Whether the key is already registered with `intents.near`
 *
 *  Requires:  INTENTS_SDK_PRIVATE_KEY_NEAR in .env
 *  Run:       pnpm sdk/get-public-key-near
 *
 */

import { fileURLToPath } from 'node:url';
import { nearJsonRpcProvider } from './utils/config';
import {
  getAccountsForPublicKey,
  getNearIntentsSigner,
} from './utils/near-config';

/**
 * Check if a public key is registered with the intents.near verifier contract.
 * Calls the `has_public_key` view method — this is a free RPC call (no gas).
 */
export async function hasPublicKey({
  accountId,
  publicKey,
}: {
  accountId: string;
  publicKey: string;
}): Promise<boolean> {
  const response = await nearJsonRpcProvider.callFunction<boolean>({
    contractId: 'intents.near', // The core intents verifier contract
    method: 'has_public_key', // View method — checks registration status
    args: {
      account_id: accountId, // The intents account to check
      public_key: publicKey, // The ed25519 public key (e.g. "ed25519:ABC...")
    },
  });

  return response ?? false;
}

/**
 * Determine whether a NEAR account ID is a named account (e.g. "alice.near")
 * or an implicit account (64-char hex string derived from a public key).
 */
export function getAccountType(accountId: string): 'named' | 'implicit' {
  return /^[0-9a-f]{64}$/.test(accountId) ? 'implicit' : 'named';
}

async function main() {
  // Load the NEAR wallet from the private key in .env
  const { publicKey, walletClient } = await getNearIntentsSigner();

  // Look up all NEAR accounts associated with this public key
  // Uses FastNEAR indexer — a named account may have added this key as a full-access key
  const details = await getAccountsForPublicKey(publicKey);

  if (details.length === 0) {
    console.log('No accounts found for public key');
    return;
  }

  // Check if this key is registered with the intents.near verifier
  const isRegistered = await hasPublicKey({
    accountId: walletClient.accountId,
    publicKey,
  });
  console.log(`Public key: ${publicKey}`);
  console.log(`Implicit account: ${walletClient.accountId}`);
  console.log(`\nUsing account: ${walletClient.accountId}`);
  console.log(
    `Key registered with intents.near: ${isRegistered ? 'yes' : 'no'}`,
  );
  if (!isRegistered) {
    console.log(
      '\nRun `pnpm sdk/add-public-key-near` to register this key before signing intents.',
    );
  }
}

// Only run when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
