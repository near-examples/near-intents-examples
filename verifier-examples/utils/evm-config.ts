/**
 *  EVM Wallet & Signer Setup
 *
 *  Creates an EVM wallet client (via Viem) and an intent signer that uses ERC-191
 *  (personal_sign) to authorize intents.
 *
 *  ERC-191 signing:
 *  ----------------
 *  EVM wallets sign intents using the ERC-191 standard (eth_sign / personal_sign).
 *  The intents contract recovers the signer's address from the signature using ecrecover,
 *  so no pre-registration is needed — unlike NEAR's NEP-413 flow.
 *
 *  Chain note:
 *  ----------
 *  The Viem wallet client is configured with `mainnet` as the chain, but this is only
 *  used for message signing (not transactions). The actual chain your tokens are on
 *  doesn't matter — intents are chain-agnostic once tokens are deposited.
 *
 */

import 'dotenv/config';
import {
  createIntentSignerViem,
  IIntentSigner,
} from '@defuse-protocol/intents-sdk';
import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
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

export type WalletClient = ViemWalletClient<Transport, Chain, Account>;

export type EvmSignerContext = {
  publicKey: string; // Uncompressed public key (for reference)
  authIdentifier: string; // Intents-internal account ID (derived from EVM address)
  signer: IIntentSigner; // ERC-191 intent signer for the SDK
  authMethod: AuthMethod; // Always AuthMethod.EVM
  account: WalletClient; // Viem wallet client for signing messages
};

/**
 * Create a Viem wallet client from a raw private key.
 * Used only for message signing (ERC-191) — no on-chain transactions are sent.
 */
export const getWalletClient = (privateKey: string): WalletClient => {
  // Derive the account from the private key (0x-prefixed hex string)
  const account = privateKeyToAccount(privateKey as Hex);
  return createWalletClient({
    account,
    chain: mainnet, // Chain is required by Viem but only affects tx signing (not used here)
    transport: http(), // Default RPC — not actually called for message signing
  });
};

/**
 * Build a full EVM signer context for the Intents SDK.
 * Returns the intent signer (ERC-191), wallet client, and auth identifiers
 * needed by all SDK operations.
 */
export const getEvmIntentsSigner = async (): Promise<EvmSignerContext> => {
  if (!process.env.INTENTS_SDK_PRIVATE_KEY_EVM) {
    throw new Error('INTENTS_SDK_PRIVATE_KEY_EVM is not set');
  }
  const walletClient = getWalletClient(
    process.env.INTENTS_SDK_PRIVATE_KEY_EVM as string,
  );

  // Create an ERC-191 intent signer — the SDK calls this whenever it needs a signature
  const signer = createIntentSignerViem({
    signer: {
      address: walletClient.account.address, // Your EVM address (0x...)
      signMessage(parameters) {
        if (!walletClient.account?.signMessage) {
          throw new Error('Sign message is required');
        }
        // Delegates to the Viem account's signMessage (ERC-191 personal_sign)
        return walletClient.account.signMessage(parameters);
      },
    },
  });

  return {
    publicKey: walletClient.account.publicKey!,
    authIdentifier: authIdentity.authHandleToIntentsUserId(
      walletClient.account.address, // Your EVM address (0x...)
      AuthMethod.EVM, // Tells the system to use EVM-style account ID derivation
    ),
    signer,
    authMethod: AuthMethod.EVM,
    account: walletClient as WalletClient,
  };
};
