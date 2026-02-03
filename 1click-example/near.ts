// Import NEAR-JS Libraries
// See docs for more information: https://docs.near.org/tools/near-api

import {
  Account,
  JsonRpcProvider,
  KeyPairSigner,
  KeyPairString,
  Provider,
} from "near-api-js";

export async function getAccount(accountId: string, privateKey: string) {
  // Create signer from private key in .env file
  const signer = KeyPairSigner.fromSecretKey(privateKey as KeyPairString);

  // Create provider for RPC connection to NEAR Blockchain
  const provider = new JsonRpcProvider({
    url: "https://rpc.mainnet.fastnear.com",
  });

  // Instantiate NEAR account to perform actions on the blockchain
  const account = new Account(accountId, provider as Provider, signer);
  return account;
}
