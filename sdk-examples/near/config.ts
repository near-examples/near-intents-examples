import {
  createIntentSignerNEP413,
  IntentsSDK,
} from '@defuse-protocol/intents-sdk';
import { AuthMethod } from '@defuse-protocol/internal-utils';
import { base64 } from '@scure/base';
import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  Provider,
} from 'near-api-js';
import { signMessage } from 'near-api-js/nep413';

/**
 *  NEAR Wallet Configuration
 *
 *  Helpers for creating a NEAR account from a key pair and signing intent
 *  messages using NEP-413. Used when the signer is a NEAR wallet.
 *
 *  NEP-413 is NEAR's off-chain message signing standard (similar to EIP-191
 *  on Ethereum). The intents system uses it so users can authorize token
 *  movements without submitting a transaction for every intent — the signed
 *  message is verified on-chain by the `intents.near` contract when the
 *  intent settles.
 *
 *  The RPC provider connects to NEAR mainnet via FastNEAR for low-latency
 *  contract queries and transaction submission.
 *
 */

export const intentsSdk = new IntentsSDK({
  env: 'production',
  referral: 'near-intents-examples',
});

// NEAR mainnet RPC provider (FastNEAR endpoint)
export const nearJsonRpcProvider = new JsonRpcProvider({
  url: 'https://rpc.mainnet.fastnear.com',
});

/**
 * Create a NEAR `Account` wrapper from a raw ed25519 private key.
 *
 * The account ID is the hex encoding of the public key's raw bytes — this is
 * a NEAR "implicit account". Unlike named accounts (e.g. "alice.near"),
 * implicit accounts exist automatically for any valid key pair and don't
 * need to be created on-chain first.
 */
export const getNearWalletFromKeyPair = (privateKey: string): Account => {
  const keyPair = KeyPair.fromString(privateKey as `ed25519:${string}`);
  const signer = new KeyPairSigner(keyPair);
  const address = Buffer.from(keyPair.getPublicKey().data).toString('hex');
  const account = new Account(address, nearJsonRpcProvider as Provider, signer);
  return account;
};

/**
 * Create an intents signer using a NEAR account via NEP-413 message signing.
 */
export const getIntentsSignerNear = () => {
  const account = getNearWalletFromKeyPair(
    process.env.INTENTS_SDK_PRIVATE_KEY_NEAR as string,
  );
  const signer = createIntentSignerNEP413({
    accountId: account.accountId,
    signMessage: async (nep413Payload) => {
      // The SDK may provide the nonce as either a number[] or a base64 string
      // depending on the transport layer; normalize to Uint8Array for NEP-413
      const nonceArray = Array.isArray(nep413Payload.nonce)
        ? new Uint8Array(nep413Payload.nonce)
        : new Uint8Array(Buffer.from(nep413Payload.nonce as string, 'base64'));

      // Sign the NEP-413 message using the NEAR account
      const signedData = await signMessage({
        signerAccount: account,
        payload: {
          nonce: nonceArray,
          message: nep413Payload.message,
          recipient: nep413Payload.recipient,
        },
      });

      if (!signedData) {
        throw new Error('Failed to sign message');
      }

      return {
        publicKey: signedData.publicKey.toString(),
        signature: base64.encode(signedData.signature),
      };
    },
  });

  return {
    authIdentifier: account.accountId,
    signer,
    authMethod: AuthMethod.Near,
    account: account,
  };
};
