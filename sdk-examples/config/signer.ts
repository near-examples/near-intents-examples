import {
  createIntentSignerNEP413,
  createIntentSignerViem,
} from '@defuse-protocol/intents-sdk';
import { AuthMethod } from '@defuse-protocol/internal-utils';
import 'dotenv/config';
import { Account } from 'near-api-js';
import { WalletClient } from 'viem';
import { getEvmWalletFromPrivateKey } from './evm';
import { getNearWalletFromKeyPair } from './near';

/*
 * Signer factories for NEAR and EVM-based intents.
 */

//for direct usage
// export const getNearIntentsSignerNearKeyPair = (keyPair: KeyPair) => {
//   const accountId = keyPair.getPublicKey().toString();
//   return createIntentSignerNearKeyPair({
//     signer: keyPair,
//     accountId: accountId,
//   });
// };

/**
 * Create an intents signer using a NEAR key pair via NEP-413 signing.
 */
const getNearIntentsSignerNear = (account: Account) => {
  return createIntentSignerNEP413({
    accountId: account.accountId,
    signMessage: async (nep413Payload) => {
      const nonceArray = Array.isArray(nep413Payload.nonce)
        ? new Uint8Array(nep413Payload.nonce)
        : new Uint8Array(Buffer.from(nep413Payload.nonce as string, 'base64'));

      const signedData = await account.signNep413Message({
        message: nep413Payload.message,
        nonce: Buffer.from(nonceArray),
        recipient: nep413Payload.recipient,
      });

      if (!signedData) {
        throw new Error('Failed to sign message');
      }

      return {
        publicKey: signedData.publicKey.toString(),
        signature: signedData.signature.toString(),
      };
    },
  });
};

/**
 * Create an intents signer backed by a Viem wallet client.
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

export const getIntentsSigner = () => {
  const privateKeyNear = process.env.INTENTS_SDK_PRIVATE_KEY_NEAR;
  const privateKeyEvm = process.env.INTENTS_SDK_PRIVATE_KEY_EVM;

  if (privateKeyNear) {
    const account = getNearWalletFromKeyPair(privateKeyNear);
    return {
      authIdentifier: account.accountId,
      signer: getNearIntentsSignerNear(account),
      authMethod: AuthMethod.Near,
    };
  }
  if (privateKeyEvm) {
    const walletClient = getEvmWalletFromPrivateKey(privateKeyEvm);
    return {
      authIdentifier: '0xB66680c46522d3c1F3126f0b9F82d12D442A0C57',
      signer: getNearIntentsSignerEvm(walletClient),
      authMethod: AuthMethod.EVM,
    };
  }

  throw new Error('No private key found');
};
