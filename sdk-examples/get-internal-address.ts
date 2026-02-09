import { fileURLToPath } from 'node:url';
import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import { getIntentsSigner } from './config/signer';

/**
 *  Get Internal Address
 *
 *  Derives the NEAR Intents internal account ID from the user's authentication
 *  credentials. This is the account ID used inside the `intents.near` verifier
 *  contract to track balances, sign intents, and receive transfers.
 *
 *  Supported auth methods:
 *   - NEAR: uses the NEAR account ID (e.g. "alice.near")
 *   - EVM:  derives an intents ID from the Ethereum address (e.g. "0x...")
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
  const { authIdentifier, authMethod } = getIntentsSigner();

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
