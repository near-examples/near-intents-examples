import { walletMessage } from '@defuse-protocol/internal-utils';
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

/**
 *  EVM Wallet Configuration
 *
 *  Helpers for creating a Viem wallet client and signing intent messages
 *  using ERC-191 personal_sign. Used when the signer is an EVM wallet.
 *
 */

export type WalletClient = ViemWalletClient<Transport, Chain, Account>;

/**
 * Build a Viem wallet client for Ethereum mainnet from a raw private key.
 */
export const getEvmWalletFromPrivateKey = (
  privateKey: string,
): WalletClient => {
  const account = privateKeyToAccount(privateKey as Hex);
  return createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });
};

/**
 * Sign an intent message using ERC-191 (personal_sign) for publishing
 * to the solver relay.
 */
export const signEvmIntentForPublish = async ({
  account,
  walletMessage,
}: {
  account: WalletClient;
  walletMessage: walletMessage.WalletMessage;
}) => {
  const signature = await account.signMessage(walletMessage.ERC191);
  return {
    type: 'ERC191',
    signatureData: signature,
    signedData: walletMessage.ERC191,
  } as const;
};
