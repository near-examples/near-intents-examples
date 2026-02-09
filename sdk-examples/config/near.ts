import { walletMessage } from '@defuse-protocol/internal-utils';
import { base64 } from '@scure/base';
import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  Provider,
} from 'near-api-js';

/**
 *  NEAR Wallet Configuration
 *
 *  Helpers for creating a NEAR account from a key pair and signing intent
 *  messages using NEP-413. Used when the signer is a NEAR wallet.
 *
 *  The RPC provider connects to NEAR mainnet via FastNEAR for low-latency
 *  contract queries and transaction submission.
 *
 */

// NEAR mainnet RPC provider (FastNEAR endpoint)
export const nearJsonRpcProvider = new JsonRpcProvider({
  url: 'https://rpc.mainnet.fastnear.com',
});

/**
 * Create a NEAR `Account` wrapper from a raw ed25519 private key.
 * The account ID is derived from the public key (hex-encoded).
 */
export const getNearWalletFromKeyPair = (privateKey: string): Account => {
  const keyPair = KeyPair.fromString(privateKey as `ed25519:${string}`);
  const signer = new KeyPairSigner(keyPair);
  const address = Buffer.from(keyPair.getPublicKey().data).toString('hex');
  const account = new Account(address, nearJsonRpcProvider as Provider, signer);
  return account;
};

/**
 * Sign an intent message using NEP-413 for publishing to the solver relay.
 * Returns the signed data with the account ID, public key, and signature.
 */
export const signNearIntentForPublish = async ({
  account,
  walletMessage,
}: {
  account: Account;
  walletMessage: walletMessage.WalletMessage;
}) => {
  // Sign the NEP-413 message using the NEAR account
  const signature = await account.signNep413Message({
    message: walletMessage.NEP413.message,
    nonce: walletMessage.NEP413.nonce,
    recipient: walletMessage.NEP413.recipient,
  });

  const publicKey = await account.getSigner()?.getPublicKey();
  if (!publicKey) {
    throw new Error('Public key not found');
  }

  return {
    type: 'NEP413',
    signatureData: {
      accountId: signature.accountId,
      publicKey: publicKey.toString(),
      signature: base64.encode(signature.signature),
    },
    signedData: walletMessage.NEP413,
  } as const;
};
