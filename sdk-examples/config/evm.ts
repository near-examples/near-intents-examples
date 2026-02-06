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
