import { fileURLToPath } from 'node:url';
import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import { formatUnits } from 'viem';
import { z } from 'zod';
import { getIntentsSigner } from './config/signer.js';
import { getTokens } from './get-tokens-list';
import { queryContract } from './utils/blockchain.js';

/**
 *  Get Token Balances
 *
 *  Reads the on-chain balances for all supported tokens inside the NEAR Intents
 *  verifier contract (`intents.near`) for a given user.
 *
 *  The intents account ID is derived from the user's auth credentials
 *  (NEAR account or EVM address) using `authHandleToIntentsUserId`.
 *
 *  Balances are fetched in a single batch call (`mt_batch_balance_of`) and
 *  returned with both raw (smallest unit) and human-readable formatted values.
 *  Only tokens with a non-zero balance are included in the output.
 *
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
  // Query the intents verifier contract for all token balances at once
  const data = await queryContract({
    contractId: 'intents.near',
    methodName: 'mt_batch_balance_of',
    args: {
      account_id: accountId,
      token_ids: tokenIds,
    },
  });

  // Parse the response: contract returns string amounts, convert to bigint
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
    // Derive the intents-internal account ID from the user's auth credentials
    const accountId = authIdentity.authHandleToIntentsUserId(
      authIdentifier,
      authMethod,
    );

    // Get the full list of supported tokens to know which IDs to query
    const supportedTokens = await getTokens();

    const tokenIds = supportedTokens.map((token) => token.assetId);
    const amountsArray = await batchBalanceOf({
      accountId,
      tokenIds,
    });

    // Map the flat array of balances back to a record keyed by token ID
    const amounts = amountsArray.reduce(
      (acc, amount, index) => {
        acc[tokenIds[index]] = amount;
        return acc;
      },
      {} as Record<string, bigint>,
    );

    // Combine token metadata with balance data and format for display
    const result = supportedTokens.map((token) => ({
      ...token,
      balance: String(amounts[token.assetId]),
      balanceFormatted: formatUnits(amounts[token.assetId], token.decimals),
    }));

    // Filter out zero-balance tokens
    return result.filter((token) => token.balance !== '0');
  } catch (error) {
    console.error(error);
    return [];
  }
};

const main = async () => {
  // Resolve the signer from environment variables (NEAR or EVM private key)
  const { authIdentifier, authMethod } = getIntentsSigner();
  console.log('Fetching balances for intents user...');
  console.log(`Auth identifier: ${authIdentifier}`);
  console.log(`Auth method: ${authMethod}`);

  const balances = await getTokenBalances({
    authIdentifier,
    authMethod,
  });

  console.log(`Found ${balances.length} token balances:\n`);
  console.table(
    balances.map((token) => ({
      assetName: token.symbol,
      intentsTokenId: token.assetId,
      balance: token.balance,
      balanceFormatted: token.balanceFormatted,
    })),
  );
};

// Only run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
