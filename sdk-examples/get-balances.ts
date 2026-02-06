import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import { formatUnits } from 'viem';
import { z } from 'zod';
import { getIntentsSigner } from './config/signer.js';
import { getTokens } from './get-tokens-list';
import { queryContract } from './utils';

/*
 * Example: read balances for all supported tokens for a given intents user.
 */

/**
 * Fetch token balances in a single contract call using `mt_batch_balance_of`.
 * Returns the raw on-chain balances as `bigint[]` in the same order as `tokenIds`.
 */
export const batchBalanceOf = async ({
  accountId,
  tokenIds,
}: {
  accountId: string;
  tokenIds: string[];
}): Promise<bigint[]> => {
  const data = await queryContract({
    contractId: 'intents.near',
    methodName: 'mt_batch_balance_of',
    args: {
      account_id: accountId,
      token_ids: tokenIds,
    },
  });

  return z
    .array(z.string())
    .transform((arr) => arr.map(BigInt))
    .parse(data);
};

/**
 * Resolve an intents account ID, fetch supported tokens, and return balances
 * with both raw and human-readable formats.
 */
export const getTokenBalances = async ({
  authIdentifier,
  authMethod,
}: {
  authIdentifier: string;
  authMethod: AuthMethod;
}) => {
  try {
    const accountId = authIdentity.authHandleToIntentsUserId(
      authIdentifier,
      authMethod,
    );
    const supportedTokens = await getTokens();

    const tokenIds = supportedTokens.map((token) => token.near_token_id);
    const amountsArray = await batchBalanceOf({
      accountId,
      tokenIds,
    });

    const amounts = amountsArray.reduce(
      (acc, amount, index) => {
        acc[tokenIds[index]] = amount;
        return acc;
      },
      {} as Record<string, bigint>,
    );

    const result = supportedTokens.map((token) => ({
      ...token,
      balance: String(amounts[token.near_token_id]),
      balanceFormatted: formatUnits(
        amounts[token.near_token_id],
        token.decimals,
      ),
    }));
    return result.filter((token) => token.balance !== '0');
  } catch (error) {
    return [];
  }
};

const main = async () => {
  const { authIdentifier, authMethod } = getIntentsSigner();
  console.log('Fetching balances for intents user...');
  console.log(`Auth identifier: ${authIdentifier}`);
  const balances = await getTokenBalances({
    authIdentifier,
    authMethod,
  });
  console.log(`Found ${balances.length} token balances:\n`);
  console.table(
    balances.map((token) => ({
      assetName: token.asset_name,
      intentsTokenId: token.intents_token_id,
      balance: token.balance,
      balanceFormatted: token.balanceFormatted,
    })),
  );
};

// Only run if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
