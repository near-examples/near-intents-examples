import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import { fileURLToPath } from 'node:url';
import { getEvmIntentsSigner } from './config';

/**
 *  Get Internal Address
 *
 *  Derives the NEAR Intents internal account ID from the user's authentication
 *  credentials. This is the account ID used inside the `intents.near` verifier
 *  contract to track balances, sign intents, and receive transfers.
 *
 * The conversion follows these rules:
 * 1. NEAR addresses: Used as-is (lowercased)
 *   - Explicit: "bob.near"
 *   - Implicit: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1"
 *
 * 2. EVM addresses: Used as-is (lowercased)
 *   - Format: "0xc0ffee254729296a45a3885639ac7e10f9d54979"
 *
 * 3. Solana addresses: Converted from base58 to hex
 *   - Input: base58 public key
 *   - Output: hex-encoded string
 *
 * 4. WebAuthn credentials: Converted based on curve type
 *   - P-256: Keccak256(prefix + pubkey) -> last 20 bytes -> hex with 0x prefix
 *   - Ed25519: Raw public key -> hex encoding
 *
 *  The resulting internal address is required for operations like checking
 *  balances, requesting deposit addresses, and specifying transfer recipients.
 *
 */

/**
 * Convert an auth handle (NEAR account or EVM address) into an intents user ID.
 */
export const getInternalAddress = async ({
  authIdentifier,
  authMethod,
}: {
  authIdentifier: string;
  authMethod: AuthMethod;
}) => {
  // Map the external identifier to the intents-internal account format
  const accountId = authIdentity.authHandleToIntentsUserId(
    authIdentifier,
    authMethod,
  );
  return accountId;
};

async function main() {
  // Resolve the signer from environment variables (NEAR or EVM private key)
  const { authIdentifier, authMethod } = getEvmIntentsSigner();

  console.log('Resolving intents internal address...');
  console.log(`Auth identifier: ${authIdentifier}`);

  const internalAddress = await getInternalAddress({
    authIdentifier,
    authMethod,
  });
  console.log(`Intents internal address: ${internalAddress}`);
}

// Only run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
