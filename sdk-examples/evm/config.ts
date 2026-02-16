import 'dotenv/config';
import {
  createIntentSignerViem,
  IntentsSDK,
} from '@defuse-protocol/intents-sdk';
import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import { JsonRpcProvider } from 'near-api-js';
import {
  Account,
  Chain,
  createWalletClient,
  Hex,
  http,
  Transport,
  WalletClient as ViemWalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

export const intentsSdk = new IntentsSDK({
  env: 'production',
  referral: 'near-intents-examples',
});

export const nearJsonRpcProvider = new JsonRpcProvider({
  url: 'https://rpc.mainnet.fastnear.com',
});

/**
 *  EVM Wallet Configuration
 *
 *  Helpers for creating a Viem wallet client and signing intent messages
 *  using ERC-191 `personal_sign`. Used when the signer is an EVM wallet.
 *
 *  ERC-191 is Ethereum's standard for signing arbitrary messages (the
 *  "\x19Ethereum Signed Message:\n" prefix). The intents system accepts
 *  these signatures to authorize token movements — even though balances live
 *  on NEAR, an EVM key can control them.
 *
 *  Note: Even with an EVM signer, all contract queries (balances, token lists)
 *  go to the NEAR RPC — the `intents.near` contract on NEAR is the single
 *  source of truth for all balances regardless of signer type.
 *
 */

export type WalletClient = ViemWalletClient<Transport, Chain, Account>;

/**
 * Build a Viem wallet client for Ethereum mainnet from a raw private key.
 */
export const getWalletClient = (privateKey: string): WalletClient => {
  const account = privateKeyToAccount(privateKey as Hex);
  return createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });
};

/**
 * Create an intents signer using a Viem wallet client (EVM) via ERC-191 signing.
 */
export const getEvmIntentsSigner = () => {
  const walletClient = getWalletClient(
    process.env.INTENTS_SDK_PRIVATE_KEY_EVM as string,
  );
  const signer = createIntentSignerViem({
    signer: {
      address: walletClient.account.address,
      signMessage(parameters) {
        if (!walletClient.account?.signMessage) {
          throw new Error('Sign message is required');
        }
        return walletClient.account.signMessage(parameters);
      },
    },
  });

  return {
    authIdentifier: authIdentity.authHandleToIntentsUserId(
      walletClient.account.address,
      AuthMethod.EVM,
    ),
    signer,
    authMethod: AuthMethod.EVM,
    account: walletClient as WalletClient,
  };
};
