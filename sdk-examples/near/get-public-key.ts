import 'dotenv/config';
import { Account, KeyPair } from 'near-api-js';
import { fileURLToPath } from 'node:url';
import { getNearWalletFromKeyPair } from './config';
import { queryContract } from './get-balances';
/**
 *  Public Key Management for NEAR Intents
 *
 *  Before a NEAR account can sign intents, its public key must be registered
 *  with the `intents.near` verifier contract via `add_public_key`. This is a
 *  one-time on-chain transaction that authorizes the key to sign off-chain
 *  intent messages (NEP-413).
 *
 *  NEAR has two types of accounts:
 *   - Named accounts (e.g. "alice.near") — human-readable, registered on-chain
 *   - Implicit accounts — derived from a public key's raw bytes as 64-char hex
 *     (e.g. "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1")
 *
 *  A single key pair can control both types: the implicit account is always
 *  derivable from the key, while named accounts are discovered via indexers
 *  like FastNEAR.
 *
 *  This script:
 *   1. Derives the key pair from INTENTS_SDK_PRIVATE_KEY_NEAR
 *   2. Looks up all named accounts associated with the public key
 *   3. Checks if the key is already registered with `intents.near`
 *   4. If not, registers it via `add_public_key`
 *
 */

/**
 * Register a public key with the `intents.near` verifier contract.
 * This is a state-changing call that requires gas and a 1-yocto deposit
 * (the deposit proves the caller owns a full-access key).
 */
export async function addPublicKeyToContract({
  account,
  publicKey,
}: {
  account: Account;
  publicKey: string;
}) {
  // callFunction() is the near-api-js v7 way to send a transaction
  return await account.callFunction({
    contractId: 'intents.near',
    methodName: 'add_public_key',
    args: { public_key: publicKey },
    gas: 5_000_000_000_000n,
    deposit: 1n,
  });
}

/**
 * Check whether a public key is already registered for a given account
 * on the `intents.near` verifier contract. This is a free view call.
 */
export async function hasPublicKey({
  accountId,
  publicKey,
}: {
  accountId: string;
  publicKey: string;
}): Promise<boolean> {
  const data = await queryContract({
    contractId: 'intents.near',
    methodName: 'has_public_key',
    args: {
      account_id: accountId,
      public_key: publicKey,
    },
  });

  return data as boolean;
}

/**
 * Query the FastNEAR indexer for all NEAR accounts controlled by a public key.
 * Returns both named (e.g. "alice.near") and implicit accounts.
 *
 * FastNEAR maintains an index of public-key → account mappings, which is
 * much faster than scanning the chain directly.
 */
export async function getAccountsForPublicKey(
  publicKey: string,
): Promise<string[]> {
  const response = await fetch(
    `https://api.fastnear.com/v0/public_key/${publicKey}/all`,
  );
  if (!response.ok) {
    throw new Error(
      `FastNEAR lookup failed: ${response.status} ${response.statusText}`,
    );
  }
  const data = (await response.json()) as { account_ids: string[] };
  return data.account_ids ?? [];
}

/**
 * Determine whether a NEAR account ID is "named" (e.g. "alice.near") or
 * "implicit" (64-character hex string derived from a public key).
 */
export function getAccountType(accountId: string): 'named' | 'implicit' {
  // Implicit accounts are exactly 64 hex characters (32 bytes of a public key)
  return /^[0-9a-f]{64}$/.test(accountId) ? 'implicit' : 'named';
}

// ---------------------------------------------------------------------------
// Main: demonstrate full public key registration flow
// ---------------------------------------------------------------------------

async function main() {
  const privateKey = process.env.INTENTS_SDK_PRIVATE_KEY_NEAR;
  if (!privateKey) {
    throw new Error(
      'Missing INTENTS_SDK_PRIVATE_KEY_NEAR environment variable',
    );
  }

  // 1. Derive key pair and extract the public key string (ed25519:...)
  const keyPair = KeyPair.fromString(privateKey as `ed25519:${string}`);
  const publicKey = keyPair.getPublicKey().toString(); // "ed25519:..."

  // The implicit account ID is the hex encoding of the raw public key bytes
  const implicitAccountId = Buffer.from(keyPair.getPublicKey().data).toString(
    'hex',
  );

  console.log(`Public key: ${publicKey}`);
  console.log(`Implicit account: ${implicitAccountId}`);

  // 2. Look up all accounts associated with this public key via FastNEAR
  const accounts = await getAccountsForPublicKey(publicKey);
  console.log(`\nAccounts for this key (${accounts.length}):`);
  for (const acct of accounts) {
    console.log(`  ${acct} (${getAccountType(acct)})`);
  }

  // If no accounts were found, use the implicit account
  const accountId = accounts.length > 0 ? accounts[0] : implicitAccountId;
  console.log(`\nUsing account: ${accountId}`);

  // 3. Check if the key is already registered with intents.near
  const isRegistered = await hasPublicKey({
    accountId,
    publicKey,
  });
  console.log(`Key registered with intents.near: ${isRegistered}`);

  if (isRegistered) {
    console.log('Key is already registered. Nothing to do.');
    return;
  }

  // 4. Register the key on-chain
  console.log('Registering public key with intents.near...');
  const account = await getNearWalletFromKeyPair(privateKey);
  const result = await addPublicKeyToContract({ account: account.account, publicKey });
  console.log('Registration successful.');
  console.log('Transaction:', JSON.stringify(result, null, 2));
}

// Only run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
