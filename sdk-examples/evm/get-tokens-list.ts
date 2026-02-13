import {
  OneClickService,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { fileURLToPath } from 'node:url';

/**
 *  Get Supported Tokens
 *
 *  Fetches the full list of tokens supported by the NEAR Intents system.
 *  This does NOT require authentication or a signer.
 *
 *  Each token entry contains metadata needed for deposits, swaps, and withdrawals:
 *   {
 *     "blockchain": "arbitrum",
 *     "symbol": "USDC",
 *     "assetId": "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
 *     "contractAddress": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
 *     "decimals": 6
 *   }
 *
 *  Helper functions `getTokenById` and `getTokenBySymbolAndBlockchain` are
 *  provided for convenient lookups used across the other examples.
 *
 */

// Re-export the token type used throughout the SDK examples
export type Token = TokenResponse;

/**
 * Fetch the current list of supported tokens across all chains.
 */
export const getTokens = async (): Promise<TokenResponse[]> => {
  // Calls the 1-Click API `/tokens` endpoint
  const tokens = await OneClickService.getTokens();
  return tokens;
};

/**
 * Look up a single token by its intents asset ID (e.g. "nep141:wrap.near").
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
 * Look up a single token by its symbol and blockchain name (e.g. "USDC" on "arbitrum").
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

  // Fetch all supported tokens from the API
  const tokens = await getTokens();
  console.log(`Found ${tokens.length} tokens:\n`);

  // Display tokens in a table
  console.table(
    tokens.map((token) => ({
      assetName: token.symbol,
      intentsTokenId: token.assetId,
      decimals: token.decimals,
    })),
  );

  // Show example token format
  console.log(
    `\nResponse format example:\n${JSON.stringify(tokens[0], null, 2)}\n`,
  );
}

// Only run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
