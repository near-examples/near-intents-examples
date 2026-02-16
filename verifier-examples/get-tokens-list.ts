/**
 *  Get Supported Tokens List
 *
 *  Fetches all tokens supported by the NEAR Intents system across every blockchain.
 *  No wallet or authentication is required — this is a read-only query.
 *
 *  NEAR Intents unifies tokens from 30+ chains (NEAR, Ethereum, Arbitrum, Solana, Bitcoin, etc.)
 *  under a single token registry. Each token is identified by an `assetId` in the format:
 *
 *    nep141:<contract>.near        — e.g. "nep141:wrap.near" (Native $NEAR)
 *    nep141:<chain>-<addr>.omft.near — e.g. "nep141:arb-0xaf88...831.omft.near" ($USDC on Arbitrum)
 *
 *  The `assetId` is used across all SDK operations (swaps, deposits, withdrawals, balances).
 *
 *  Provides helper utilities used by other examples:
 *   - getTokens()                                       — full token list
 *   - getTokenById({ intents_token_id })                — lookup by assetId
 *   - getTokenBySymbolAndBlockchain({ symbol, blockchain }) — lookup by symbol + chain name
 *
 *  Run:  pnpm sdk/get-tokens-list
 *
 */

import {
  OneClickService,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { fileURLToPath } from 'node:url';

export type Token = TokenResponse;

/**
 * Fetch every token the intents system supports.
 * Calls the 1-Click `/tokens` REST endpoint — no auth needed.
 */
export const getTokens = async (): Promise<TokenResponse[]> => {
  const tokens = await OneClickService.getTokens();
  return tokens;
};

/**
 * Find a single token by its intents asset ID (e.g. "nep141:wrap.near").
 * Returns `undefined` if the token is not in the registry.
 */
export const getTokenById = async ({
  intents_token_id,
}: {
  intents_token_id: string;
}): Promise<TokenResponse | undefined> => {
  const tokens = await getTokens();
  return tokens.find((token) => token.assetId === intents_token_id);
};

/**
 * Find a token by its ticker symbol and blockchain name.
 * Useful when you know the human-readable name but not the full assetId.
 * Example: getTokenBySymbolAndBlockchain({ symbol: "USDC", blockchain: "arbitrum" })
 */
export const getTokenBySymbolAndBlockchain = async ({
  symbol,
  blockchain,
}: {
  symbol: string;
  blockchain: string;
}): Promise<TokenResponse | undefined> => {
  const tokens = await getTokens();
  return tokens.find(
    (token) => token.symbol === symbol && token.blockchain === blockchain,
  );
};

async function main() {
  console.log('Fetching supported tokens...');

  // Query the full token registry — returns tokens from all supported chains
  const tokens = await getTokens();
  console.log(`Found ${tokens.length} tokens:\n`);

  // Display a summary table with the most useful fields
  console.table(
    tokens.map((token) => ({
      assetName: token.symbol, // Human-readable ticker (e.g. "USDC", "NEAR")
      intentsTokenId: token.assetId, // Unique ID used across all SDK operations
      decimals: token.decimals, // Token precision (e.g. 24 for NEAR, 6 for USDC)
    })),
  );

  // Show the raw response shape so you know what fields are available
  if (tokens.length > 0) {
    console.log(
      `\nResponse format example:\n${JSON.stringify(tokens[0], null, 2)}\n`,
    );
  }
}

// Only run when executed directly (not when imported by other examples)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
