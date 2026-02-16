/**
 *  Shared SDK Configuration
 *
 *  Initializes the two core dependencies used by all SDK examples:
 *
 *  1. IntentsSDK  — the main entry point for building, signing, and submitting intents.
 *     Handles nonce generation, intent construction, solver relay communication,
 *     and settlement polling. Configured for NEAR mainnet ("production").
 *
 *  2. JsonRpcProvider — a NEAR RPC client used for read-only contract queries
 *     (e.g. balance lookups, public key checks). Points to FastNEAR for low latency.
 *
 */

import { IntentsSDK } from '@defuse-protocol/intents-sdk';
import { JsonRpcProvider } from 'near-api-js';

// The Intents SDK instance — used for building intents, signing, and settlement
export const intentsSdk = new IntentsSDK({
  env: 'production', // NEAR mainnet — use 'staging' for testnet
  referral: 'near-intents-examples', // Referral tag for analytics/fee sharing
});

// NEAR RPC provider — used for view calls (balances, key checks) without gas
export const nearJsonRpcProvider = new JsonRpcProvider({
  url: 'https://rpc.mainnet.fastnear.com', // FastNEAR — low-latency NEAR RPC endpoint
});
