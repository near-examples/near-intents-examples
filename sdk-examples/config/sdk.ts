import { IntentsSDK } from '@defuse-protocol/intents-sdk';

/**
 *  SDK Configuration
 *
 *  Shared Intents SDK instance used by all SDK examples.
 *  Configured for the production environment with a referral identifier
 *  for tracking example usage.
 *
 */

export const intentsSdk = new IntentsSDK({
  env: 'production',
  referral: 'near-intents-examples',
});
