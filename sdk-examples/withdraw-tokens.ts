/**
 *  Withdraw Tokens
 *
 *  Moves tokens out of your intents account to an external wallet address on any supported chain.
 *  The withdrawal is settled on-chain via the POA bridge, so a bridge fee applies.
 *
 *  Why withdrawals?
 *  ----------------
 *  Tokens inside the intents system are held by the `intents.near` smart contract.
 *  To use them on an external chain (e.g. spend USDC on Arbitrum, send BTC to cold storage),
 *  you need to withdraw — the bridge releases the real tokens on the destination chain.
 *
 *  Two-phase flow:
 *   1. Fee estimation — call `estimateWithdrawalFee` to see the expected bridge fee
 *      before committing. Set `withdrawalQuoteOnly = true` to stop here.
 *   2. Submission — sign the intent, submit it, and wait for on-chain settlement.
 *      The SDK handles signing, broadcasting, and polling for completion.
 *
 *  Fee modes:
 *   - `feeInclusive: true`  — fee is deducted from the withdrawal amount (you receive less)
 *   - `feeInclusive: false` — fee is added on top (you need extra balance to cover it)
 *
 *  Configure the variables below:
 *   - `tokenId`            — the token to withdraw (e.g. "nep141:wrap.near")
 *   - `amount`             — human-readable amount (e.g. "0.1")
 *   - `destinationAddress` — external wallet address on the target chain
 *   - `destinationMemo`    — optional memo (required for some chains like Stellar, XRP)
 *   - `withdrawalQuoteOnly` — set to true to only see the fee quote without executing
 *
 *  Run:  pnpm sdk/withdraw-tokens
 *
 */

import { IIntentSigner, WithdrawalParams } from '@defuse-protocol/intents-sdk';
import { fileURLToPath } from 'node:url';
import { parseUnits, stringify } from 'viem';
import { getTokenById, Token } from './get-tokens-list';
import { intentsSdk } from './utils/config';
import { getSigner } from './utils/signer';

/**
 * Estimate the bridge fee for a withdrawal without executing it.
 * Returns fee details including the amount that will be deducted.
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
  const estimatedWithdrawalFee = await intentsSdk.estimateWithdrawalFee({
    withdrawalParams: {
      assetId: fromToken.assetId, // Token to withdraw
      amount: BigInt(amount), // Amount in smallest unit
      destinationAddress, // External wallet address on the target chain
      feeInclusive: true, // Fee is deducted from the amount (receive less)
      destinationMemo, // Required for Stellar, XRP, etc.
    },
  });
  return estimatedWithdrawalFee;
};

/**
 * Sign and submit the withdrawal intent, then wait for on-chain settlement.
 * The bridge releases the real tokens on the destination chain once settled.
 */
export const submitWithdrawal = async ({
  withdrawalParams,
  signer,
}: {
  withdrawalParams: WithdrawalParams;
  signer: IIntentSigner;
}) => {
  // Attach your wallet signer to the SDK instance
  intentsSdk.setIntentSigner(signer);

  // Process the full withdrawal: build intent → sign → submit → wait for bridge
  const withdrawal = await intentsSdk.processWithdrawal({
    withdrawalParams,
  });

  // Wait for the intent to be settled on-chain (bridge completion)
  // This may take a few seconds to minutes depending on the destination chain
  const intentTx = await intentsSdk.waitForIntentSettlement({
    intentHash: withdrawal.intentHash,
  });
  return intentTx;
};

// ── Configuration ──────────────────────────────────────────────────────────────
const tokenId = 'nep141:wrap.near'; // Token to withdraw (see get-tokens-list.ts for options)
const amount = '0.1'; // Human-readable amount
const destinationAddress = ''; // Replace with your external wallet address
const destinationMemo = undefined; // Set for chains that require a memo (Stellar, XRP, etc.)
const withdrawalQuoteOnly = false; // Set to true to only see fee quote without executing

async function main() {
  // Auto-detect signer type (NEAR or EVM) based on which .env key is set
  const { signer } = await getSigner();
  if (!signer) {
    throw new Error('Signer not found');
  }

  // Look up token metadata from the registry
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

  // Convert human-readable amount to smallest unit using token's decimals
  const amountIn = parseUnits(amount, token.decimals).toString();

  // Phase 1: Get fee estimation
  const withdrawalQuote = await getWithdrawalQuote({
    fromToken: token,
    amount: amountIn,
    destinationAddress,
    destinationMemo,
  });

  // If quote-only mode, display the fee and exit
  if (withdrawalQuoteOnly) {
    console.log('\nWithdrawal fee quote:');
    console.log(stringify(withdrawalQuote, null, 2));
    return;
  }

  // Phase 2: Execute the withdrawal
  const intentTx = await submitWithdrawal({
    withdrawalParams: {
      assetId: token.assetId, // Token to withdraw
      amount: BigInt(amountIn), // Amount in smallest unit
      destinationAddress, // External wallet on the target chain
      feeInclusive: true, // Fee deducted from amount (you receive amount - fee)
      destinationMemo, // Memo for chains that require it
    },
    signer,
  });
  console.log('\nWithdrawal submitted. Settlement result:');
  console.log(JSON.stringify(intentTx, null, 2));
}

// Only run when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
