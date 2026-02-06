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

/*
 * EVM client setup helpers for signing intents.
 */

export type WalletClient = ViemWalletClient<Transport, Chain, Account>;

/**
 * Build a Viem wallet client for mainnet using the provided account.
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
