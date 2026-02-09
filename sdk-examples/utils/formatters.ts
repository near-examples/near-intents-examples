import {
  type AuthMethod,
  authIdentity,
  prepareBroadcastRequest,
  type walletMessage,
} from '@defuse-protocol/internal-utils';

/**
 *  Formatting Utilities
 *
 *  Helpers for converting between external identifiers and the NEAR Intents
 *  protocol wire format. Used internally by the message creation utilities.
 *
 */

/**
 * A branded string type representing a Defuse user ID.
 * The brand prevents accidental mixing with regular strings in TypeScript.
 */
export type IntentsUserId = string & { __brand: 'IntentsUserId' };

export interface SignerCredentials {
  /** The credential (blockchain address or WebAuthn public key) that will sign or has signed the intent */
  credential: string;
  /** The type of credential (chain or authentication method) */
  credentialType: AuthMethod;
}

/**
 * Serializes a signed intent into the protocol's wire format.
 * Transforms both signature and message data into the standardized
 * encoding expected by the NEAR Intents Protocol.
 */
export function formatSignedIntent(
  signature: walletMessage.WalletSignatureResult,
  credentials: SignerCredentials,
) {
  return prepareBroadcastRequest.prepareSwapSignedData(signature, {
    userAddress: credentials.credential,
    userChainType: credentials.credentialType,
  });
}

/**
 * Converts a user's blockchain address or WebAuthn credential to a
 * standardized NEAR Intents protocol user ID.
 */
export function formatUserIdentity(
  credentials: SignerCredentials,
): IntentsUserId {
  return authIdentity.authHandleToIntentsUserId(
    credentials.credential,
    credentials.credentialType,
  );
}
