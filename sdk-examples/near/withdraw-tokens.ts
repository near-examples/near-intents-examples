import { IIntentSigner, WithdrawalParams } from '@defuse-protocol/intents-sdk';
import { fileURLToPath } from 'node:url';
import { parseUnits, stringify } from 'viem';
import { getIntentsSignerNear, intentsSdk } from './config';
import { getTokenById, Token } from './get-tokens-list';

/**
 *  Withdraw Tokens
 *
 *  Withdraws tokens from your NEAR Intents account to an external address
 *  on the token's native chain (e.g. NEAR, Arbitrum, Solana, etc.).
 *
 *  Withdrawal fees cover the gas costs on the destination chain (e.g. Ethereum
 *  L1 gas, Solana transaction fees). The fee varies by chain and is estimated
 *  before submission so you know the exact cost upfront.
 *
 *  When `feeInclusive: true`, the fee is deducted from the withdrawal amount —
 *  so if you withdraw 1.0 USDC with a 0.01 fee, you receive 0.99 USDC on the
 *  destination chain. This avoids needing to calculate the fee separately.
 *
 *  The process is:
 *   1. Estimate the withdrawal fee using `estimateWithdrawalFee`
 *   2. Submit the withdrawal using `processWithdrawal`
 *   3. Wait for the intent to settle on-chain
 *
 *  Set `withdrawalQuoteOnly = true` to preview fees without executing the withdrawal.
 *
 *  NOTE: Some chains (e.g. XRP Ledger) require a `destinationMemo` to identify
 *  the recipient. For most chains, this can be left undefined.
 *
 */

/**
 * Estimate withdrawal fees for a given token/amount and destination.
 * The returned fee estimation is used to display cost to the user.
 */
export const getWithdrawalQuote = async ({
  fromToken,
  amount,
  destinationAddress,
  destinationMemo,
}: {
  fromToken: Token;
  amount: string;
  destinationAddress: string;
  destinationMemo?: string;
}) => {
  // Estimate the bridging/withdrawal fee via the SDK
  const estimatedWithdrawalFee = await intentsSdk.estimateWithdrawalFee({
    withdrawalParams: {
      assetId: fromToken.assetId,
      amount: BigInt(amount),
      destinationAddress,
      feeInclusive: true, // Fee is included in the withdrawal amount
      destinationMemo,
    },
  });
  return estimatedWithdrawalFee;
};

/**
 * Submit a withdrawal based on prepared parameters and wait for settlement.
 * Returns the settlement transaction details once confirmed.
 */
export const submitWithdrawal = async ({
  withdrawalParams,
  signer,
}: {
  withdrawalParams: WithdrawalParams;
  signer: IIntentSigner;
}) => {
  // Set the signer and process the withdrawal
  intentsSdk.setIntentSigner(signer);
  const withdrawal = await intentsSdk.processWithdrawal({
    withdrawalParams,
  });

  // Wait for the intent to settle on-chain
  const intentTx = await intentsSdk.waitForIntentSettlement({
    intentHash: withdrawal.intentHash,
  });
  return intentTx;
};

// Example Withdrawal Configuration
const tokenId = 'nep141:wrap.near'; // Wrapped NEAR
const amount = '0.1'; // Human-readable amount (will be converted to smallest unit)
const destinationAddress = ''; // Destination address on the token's native chain
const destinationMemo = undefined; // Only required for XRP Ledger withdrawals
const withdrawalQuoteOnly = false; // Set to true to preview fees without executing

async function main() {
  // Resolve the signer from environment variables
  const { signer } = await getIntentsSignerNear();
  if (!signer) {
    throw new Error('Signer not found');
  }

  // Look up the token by its intents asset ID
  const token = await getTokenById({
    intents_token_id: tokenId,
  });
  if (!token) {
    throw new Error('Token not found');
  }

  console.log('Preparing withdrawal...');
  console.log(`Token: ${token.assetId}`);
  console.log(`Amount (human): ${amount}`);
  console.log(`Destination: ${destinationAddress}`);

  // Convert human-readable amount to smallest unit using token decimals
  const amountIn = parseUnits(amount, token.decimals).toString();

  // Step 1: Estimate withdrawal fees
  const withdrawalQuote = await getWithdrawalQuote({
    fromToken: token,
    amount: amountIn,
    destinationAddress: destinationAddress,
    destinationMemo: destinationMemo,
  });

  if (withdrawalQuoteOnly) {
    console.log('\nWithdrawal fee quote:');
    console.log(stringify(withdrawalQuote, null, 2));
    return;
  }

  // Step 2: Submit the withdrawal and wait for settlement
  const intentTx = await submitWithdrawal({
    withdrawalParams: {
      assetId: token.assetId,
      amount: BigInt(amountIn),
      destinationAddress: destinationAddress,
      feeInclusive: true,
      destinationMemo: destinationMemo,
    },
    signer: signer,
  });
  console.log('\nWithdrawal submitted. Settlement result:');
  console.log(JSON.stringify(intentTx, null, 2));
}

// Only run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
