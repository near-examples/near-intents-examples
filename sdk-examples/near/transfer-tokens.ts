import {
  createInternalTransferRoute,
  IIntentSigner,
  RouteEnum,
} from '@defuse-protocol/intents-sdk';
import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import { fileURLToPath } from 'node:url';
import { parseUnits } from 'viem';
import { getIntentsSignerNear, intentsSdk } from './config';
import { getTokenById, Token } from './get-tokens-list';

/**
 *  Transfer Tokens (Internal)
 *
 *  Transfers tokens between two intents accounts without leaving the system.
 *  This is an internal transfer — no bridging or on-chain transactions on
 *  external chains are involved, so there are no withdrawal fees.
 *
 *  Why "withdrawal" API for internal transfers?
 *  The SDK reuses the withdrawal flow with a special `InternalTransfer` route.
 *  Under the hood, both operations move tokens out of your balance — the only
 *  difference is the destination: another intents account vs. an external chain.
 *  Because tokens never leave the NEAR chain, the fee is zero.
 *
 *  The process is:
 *   1. Build a withdrawal intent with the `InternalTransfer` route
 *   2. Sign the intent with the configured signer (NEAR or EVM)
 *   3. Submit the signed intent and wait for on-chain settlement
 *
 *  The recipient address should be the intents-internal user ID of the receiver.
 *  Use `authHandleToIntentsUserId` to convert an external address to the
 *  internal format.
 *
 */

/**
 * Transfer tokens internally between intents accounts using the internal route.
 * Returns the settlement transaction hash once confirmed.
 */
export const transferToken = async ({
  token,
  amount,
  toAddress,
  signer,
}: {
  token: Token;
  amount: string;
  toAddress: string;
  signer: IIntentSigner;
}) => {
  // Build the withdrawal intent with the internal transfer route (no bridging)
  const withdrawalIntents = await intentsSdk.createWithdrawalIntents({
    withdrawalParams: {
      assetId: token.assetId,
      amount: BigInt(amount),
      // Convert the recipient's external address to an intents-internal user ID
      destinationAddress: authIdentity.authHandleToIntentsUserId(
        toAddress,
        AuthMethod.EVM,
      ),
      destinationMemo: undefined, // Only used for XRP Ledger withdrawals
      feeInclusive: false,
      // Use the internal transfer route (no external chain fees)
      routeConfig: createInternalTransferRoute(),
    },
    // Internal transfers have zero fees
    feeEstimation: {
      amount: 0n,
      quote: null,
      underlyingFees: {
        [RouteEnum.InternalTransfer]: null,
      },
    },
  });

  // Set the signer and submit the intent
  intentsSdk.setIntentSigner(signer);

  const { intentHash } = await intentsSdk.signAndSendIntent({
    intents: withdrawalIntents,
  });

  // Wait for the intent to settle on-chain
  const { hash } = await intentsSdk.waitForIntentSettlement({ intentHash });
  return {
    txHash: hash,
  };
};

// Example Transfer Configuration
const tokenId = 'nep141:wrap.near'; // Wrapped NEAR
const amount = '0.1'; // Human-readable amount (will be converted to smallest unit)

// Replace '0xxxxxx' with the actual EVM address you want to transfer to
const toAddress = authIdentity.authHandleToIntentsUserId(
  '0xxxxxx',
  AuthMethod.EVM,
);

async function main() {
  // Look up the token by its intents asset ID
  const token = await getTokenById({
    intents_token_id: tokenId,
  });
  if (!token) {
    throw new Error('Token not found');
  }

  console.log('Preparing internal transfer...');
  console.log(`Token: ${token.assetId}`);
  console.log(`Amount (human): ${amount}`);
  console.log(`To: ${toAddress}`);

  // Convert human-readable amount to smallest unit using token decimals
  const amountIn = parseUnits(amount, token.decimals).toString();

  // Resolve the signer from environment variables
  const { signer } = getIntentsSignerNear();
  if (!signer) {
    throw new Error('Signer not found');
  }

  const txHash = await transferToken({
    token: token,
    amount: amountIn,
    toAddress: toAddress,
    signer: signer,
  });
  console.log('Transfer submitted:');
  console.log(JSON.stringify(txHash, null, 2));
}

// Only run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
