/**
 *  Signer Auto-Detection
 *
 *  Determines which wallet type to use based on the environment variables set in `.env`.
 *  Most SDK examples call `getSigner()` so they work with both NEAR and EVM wallets
 *  without any code changes — just set the right private key.
 *
 *  Priority:
 *   1. If INTENTS_SDK_PRIVATE_KEY_EVM is set  → uses EVM signer (ERC-191)
 *   2. If INTENTS_SDK_PRIVATE_KEY_NEAR is set → uses NEAR signer (NEP-413)
 *   3. If neither is set                     → throws an error
 *
 */

import 'dotenv/config';
import { EvmSignerContext, getEvmIntentsSigner } from './evm-config';
import { getNearIntentsSigner, NearSignerContext } from './near-config';

export const getSigner = async (): Promise<
  EvmSignerContext | NearSignerContext
> => {
  // EVM key takes priority if both are set
  if (process.env.INTENTS_SDK_PRIVATE_KEY_EVM) {
    return await getEvmIntentsSigner();
  }
  if (process.env.INTENTS_SDK_PRIVATE_KEY_NEAR) {
    return await getNearIntentsSigner();
  }
  throw new Error(
    'INTENTS_SDK_PRIVATE_KEY_EVM or INTENTS_SDK_PRIVATE_KEY_NEAR is not set',
  );
};
