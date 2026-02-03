import { IntentsSDK } from "@defuse-protocol/intents-sdk";

/*
 * Shared SDK configuration for the examples.
 */

/**
 * Shared Intents SDK instance configured for production.
 */
export const intentsSdk = new IntentsSDK({
  env: "production",
  referral: "near-intents-examples",
});
