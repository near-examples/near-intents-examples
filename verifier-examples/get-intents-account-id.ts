/**
 *  Get Intents Account ID
 *
 *  Derives the intents-internal account ID from your wallet credentials.
 *  Every wallet (NEAR or EVM) maps to a unique account inside the `intents.near` contract —
 *  this script shows you that mapping without performing any on-chain transaction.
 *
 *  Why do you need this?
 *  --------------------
 *  The intents system maintains its own account namespace. Your external wallet address
 *  (e.g. "alice.near" or "0x1234...") is converted into a deterministic intents-internal ID.
 *  This ID is used everywhere inside the system:
 *   - Querying token balances
 *   - Requesting deposit addresses
 *   - Specifying transfer recipients
 *   - Signing and settling intents
 *
 *  Mapping rules:
 *   - NEAR named accounts   → kept as-is (e.g. "alice.near")
 *   - NEAR implicit accounts → hex-encoded public key (64 chars)
 *   - EVM addresses          → hashed into a deterministic NEAR-style account ID
 *
 *  Run:  pnpm sdk/get-intents-account-id
 *
 */

import { authIdentity } from '@defuse-protocol/internal-utils';
import { fileURLToPath } from 'node:url';
import { getSigner } from './utils/signer';

async function main() {
  // Auto-detect signer type (NEAR or EVM) based on which .env key is set
  const { authIdentifier, authMethod } = await getSigner();

  console.log('Resolving intents internal address...');
  console.log(`Auth identifier: ${authIdentifier}`);

  // Convert wallet credentials → intents-internal account ID
  // This is a pure local derivation — no network call required
  const internalAddress = authIdentity.authHandleToIntentsUserId(
    authIdentifier,
    authMethod,
  );
  console.log(`Intents internal address: ${internalAddress}`);
}

// Only run when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
