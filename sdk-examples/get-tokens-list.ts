import { poaBridge } from '@defuse-protocol/internal-utils';

/*
 * Example: list tokens supported by the bridge/intents system.
 */

/**
 * Token type returned by the POA bridge `getSupportedTokens` endpoint.
 */
export type Token = Awaited<
  ReturnType<typeof poaBridge.httpClient.getSupportedTokens>
>['tokens'][number];

/**
 * Fetch the current list of supported tokens across chains.
 */
export const getTokens = async (): Promise<Token[]> => {
  const tokens = await poaBridge.httpClient.getSupportedTokens({});
  return tokens.tokens;
};

export const getTokenById = async ({
  intents_token_id,
}: {
  intents_token_id: string;
}): Promise<Token | undefined> => {
  const tokens = await getTokens();
  return tokens.find((token) => token.intents_token_id === intents_token_id);
};

async function main() {
  console.log('Fetching supported tokens...');
  const tokens = await getTokens();
  console.log(`Found ${tokens.length} tokens:\n`);
  console.table(
    tokens.map((token) => ({
      assetName: token.asset_name,
      intentsTokenId: token.intents_token_id,
      decimals: token.decimals,
    })),
  );
  console.log(
    `\nResponse format example:\n${JSON.stringify(tokens[0], null, 2)}\n`,
  );
}

// Only run if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
