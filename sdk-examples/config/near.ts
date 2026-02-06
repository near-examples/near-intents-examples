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
