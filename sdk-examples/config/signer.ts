import {
  createIntentSignerNEP413,
  createIntentSignerViem,
} from '@defuse-protocol/intents-sdk';
import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import 'dotenv/config';
import { Account } from 'near-api-js';
import { signMessage } from 'near-api-js/nep413';
import { base64 } from '@scure/base';
import { getEvmWalletFromPrivateKey, WalletClient } from './evm';
import { getNearWalletFromKeyPair } from './near';

/**
 *  Signer Configuration
 *
 *  Factory functions to create intent signers for NEAR and EVM wallets.
 *  The signer is responsible for signing intent messages before they are
 *  published to the solver relay.
 *
 *  Supported signing methods:
 *   - NEAR: NEP-413 message signing (via `near-api-js`)
 *   - EVM:  ERC-191 message signing (via `viem`)
 *
 *  Configure your private key in `.env`:
 *   - INTENTS_SDK_PRIVATE_KEY_NEAR  — NEAR key pair (ed25519:...)
 *   - INTENTS_SDK_PRIVATE_KEY_EVM   — EVM private key (0x...)
 *
 *  `getIntentsSigner()` auto-detects which key is available and returns
 *  the appropriate signer, auth identifier, auth method, and account.
 *
 */

/**
 * Create an intents signer using a NEAR account via NEP-413 message signing.
 */
const getNearIntentsSignerNear = (account: Account) => {
  return createIntentSignerNEP413({
    accountId: account.accountId,
    signMessage: async (nep413Payload) => {
      // Convert the nonce to a Uint8Array (may come as array or base64 string)
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
};

/**
 * Create an intents signer using a Viem wallet client (EVM) via ERC-191 signing.
 */
const getNearIntentsSignerEvm = (walletClient: WalletClient) => {
  if (!walletClient.account) {
    throw new Error('Account is required');
  }
  return createIntentSignerViem({
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
};

/**
 * Auto-detect the configured private key and return the matching signer.
 * Checks NEAR first, then EVM. Throws if neither is set in the environment.
 */
export const getIntentsSigner = () => {
  const privateKeyNear = process.env.INTENTS_SDK_PRIVATE_KEY_NEAR;
  const privateKeyEvm = process.env.INTENTS_SDK_PRIVATE_KEY_EVM;

  // NEAR signer: derive account from key pair, sign via NEP-413
  if (privateKeyNear) {
    const account = getNearWalletFromKeyPair(privateKeyNear);
    return {
      authIdentifier: account.accountId,
      signer: getNearIntentsSignerNear(account),
      authMethod: AuthMethod.Near,
      account: account,
    };
  }

  // EVM signer: derive wallet from private key, sign via ERC-191
  if (privateKeyEvm) {
    const walletClient = getEvmWalletFromPrivateKey(privateKeyEvm);
    return {
      authIdentifier: authIdentity.authHandleToIntentsUserId(
        walletClient.account.address,
        AuthMethod.EVM,
      ),
      signer: getNearIntentsSignerEvm(walletClient),
      authMethod: AuthMethod.EVM,
      account: walletClient as WalletClient,
    };
  }

  throw new Error('No private key found');
};
