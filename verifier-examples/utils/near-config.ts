/**
 *  NEAR Wallet & Signer Setup
 *
 *  Creates a NEAR wallet client and an intent signer that uses NEP-413
 *  (NEAR's off-chain message signing standard) to authorize intents.
 *
 *  NEP-413 signing:
 *  ----------------
 *  Unlike on-chain transactions, intents are signed off-chain using NEP-413.
 *  The signed message includes: a human-readable payload, a unique nonce, and
 *  the recipient contract (intents.near). The contract verifies the ed25519
 *  signature against your registered public key.
 *
 *  Account resolution:
 *  ------------------
 *  From a private key, the script derives the public key and looks up associated
 *  NEAR accounts via FastNEAR. If a named account (e.g. "alice.near") exists,
 *  it's used; otherwise the implicit account (64-char hex) is used.
 *
 */

import 'dotenv/config';
import {
  createIntentSignerNEP413,
  IIntentSigner,
} from '@defuse-protocol/intents-sdk';
import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import { base64 } from '@scure/base';
import { Account, KeyPair, KeyPairSigner, Provider } from 'near-api-js';
import { signMessage } from 'near-api-js/nep413';
import { nearJsonRpcProvider } from './config';

export type NearSignerContext = {
  authIdentifier: string; // Intents-internal account ID
  signer: IIntentSigner; // NEP-413 intent signer for the SDK
  authMethod: AuthMethod; // Always AuthMethod.Near
  publicKey: string; // ed25519 public key string (e.g. "ed25519:ABC...")
  walletClient: {
    accountId: string; // NEAR account ID (named or implicit)
    account: Account; // near-api-js Account instance for signing
  };
};

/**
 * Look up all NEAR accounts associated with a public key.
 * Uses the FastNEAR indexer API — a named account may have added this key as a full-access key.
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
 * Create a NEAR Account instance from a private key.
 * Resolves the account ID by looking up associated accounts via FastNEAR.
 * Falls back to the implicit account (hex public key) if no named account is found.
 */
export const getNearWalletFromKeyPair = async (
  privateKey: string,
): Promise<{
  keyPair: KeyPair;
  accountId: string;
  account: Account;
}> => {
  // Parse the ed25519 private key (format: "ed25519:BASE58...")
  const keyPair = KeyPair.fromString(privateKey as `ed25519:${string}`);
  const signer = new KeyPairSigner(keyPair);

  // Derive the implicit account ID (hex-encoded public key, 64 chars)
  const address = Buffer.from(keyPair.getPublicKey().data).toString('hex');

  // Create a NEAR Account instance connected to the RPC provider
  const account = new Account(address, nearJsonRpcProvider as Provider, signer);

  // Look up named accounts associated with this key (e.g. "alice.near")
  // If found, use the named account; otherwise fall back to the implicit account
  const accounts = await getAccountsForPublicKey(
    keyPair.getPublicKey().toString(),
  );
  const accountId = accounts.length > 0 ? accounts[0] : address;

  return {
    keyPair,
    accountId,
    account,
  };
};

/**
 * Build a full NEAR signer context for the Intents SDK.
 * Returns the intent signer (NEP-413), account info, and auth identifiers
 * needed by all SDK operations.
 */
export const getNearIntentsSigner = async (): Promise<NearSignerContext> => {
  if (!process.env.INTENTS_SDK_PRIVATE_KEY_NEAR) {
    throw new Error('INTENTS_SDK_PRIVATE_KEY_NEAR is not set');
  }
  const account = await getNearWalletFromKeyPair(
    process.env.INTENTS_SDK_PRIVATE_KEY_NEAR as string,
  );

  // Create a NEP-413 intent signer — the SDK calls this whenever it needs a signature
  const signer = createIntentSignerNEP413({
    accountId: account.accountId,
    signMessage: async (nep413Payload) => {
      // Convert the nonce to a Uint8Array (may arrive as array or base64 string)
      const nonceArray = Array.isArray(nep413Payload.nonce)
        ? new Uint8Array(nep413Payload.nonce)
        : new Uint8Array(Buffer.from(nep413Payload.nonce as string, 'base64'));

      // Sign the NEP-413 message using near-api-js
      const signedData = await signMessage({
        signerAccount: account.account,
        payload: {
          nonce: nonceArray, // Unique nonce (prevents replay attacks)
          message: nep413Payload.message, // Human-readable intent message
          recipient: nep413Payload.recipient, // Target contract (intents.near)
        },
      });

      if (!signedData) {
        throw new Error('Failed to sign message');
      }

      return {
        publicKey: signedData.publicKey.toString(), // ed25519 public key used for signing
        signature: base64.encode(signedData.signature), // Base64-encoded ed25519 signature
      };
    },
  });

  return {
    authIdentifier: authIdentity.authHandleToIntentsUserId(
      account.accountId,
      AuthMethod.Near,
    ),
    signer,
    publicKey: account.keyPair.getPublicKey().toString(),
    authMethod: AuthMethod.Near,
    walletClient: account,
  };
};
