import { walletMessage } from '@defuse-protocol/internal-utils';
import { base64 } from '@scure/base';
import {
  Account,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  Provider,
} from 'near-api-js';
/*
 * NEAR RPC configuration and account helpers.
 */

export const nearJsonRpcProvider = new JsonRpcProvider({
  url: 'https://rpc.mainnet.fastnear.com',
});

/**
 * Create a NEAR `Account` wrapper from a raw `KeyPair`.
 */
export const getNearWalletFromKeyPair = (privateKey: string): Account => {
  const keyPair = KeyPair.fromString(privateKey as `ed25519:${string}`);
  const signer = new KeyPairSigner(keyPair);
  const address = Buffer.from(keyPair.getPublicKey().data).toString('hex');
  const account = new Account(address, nearJsonRpcProvider as Provider, signer);
  return account;
};

export const signNearIntentForPublish = async ({
  account,
  walletMessage,
}: {
  account: Account;
  walletMessage: walletMessage.WalletMessage;
}) => {
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
