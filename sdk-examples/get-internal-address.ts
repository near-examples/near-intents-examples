import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import { getIntentsSigner } from './config/signer';

/*
 * Example: derive the intents internal account ID from an auth handle.
 */

/**
 * Convert an auth handle into an intents user ID.
 */
export const getInternalAddress = async ({
  authIdentifier,
  authMethod,
}: {
  authIdentifier: string;
  authMethod: AuthMethod;
}) => {
  const accountId = authIdentity.authHandleToIntentsUserId(
    authIdentifier,
    authMethod,
  );
  return accountId;
};

async function main() {
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
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
