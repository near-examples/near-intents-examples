/**
 *  Transfer Tokens (Internal)
 *
 *  Sends tokens from your intents account to another intents account.
 *  This is an off-chain internal transfer — no gas fees, instant settlement,
 *  and both sender and recipient stay inside the intents system.
 *
 *  Why internal transfers?
 *  ----------------------
 *  When two users both have intents accounts, moving tokens between them
 *  doesn't require an on-chain transaction on any external blockchain.
 *  The `intents.near` contract simply debits the sender and credits the receiver
 *  in a single atomic operation — faster and cheaper than any L1/L2 transfer.
 *
 *  How it works:
 *   1. Look up the token metadata by its intents asset ID
 *   2. Convert the recipient's external address to their intents-internal account ID
 *   3. Build a withdrawal intent with the `InternalTransfer` route (stays inside intents)
 *   4. Sign the intent with your wallet (NEAR or EVM)
 *   5. Submit and wait for settlement
 *
 *  Configure the variables below:
 *   - `tokenId`   — the token to transfer (e.g. "nep141:wrap.near")
 *   - `amount`    — human-readable amount (e.g. "0.1")
 *   - `toAddress` — recipient's external wallet address (converted to intents ID internally)
 *
 *  Run:  pnpm sdk/transfer-tokens
 *
 */

import {
  createInternalTransferRoute,
  IIntentSigner,
  RouteEnum,
} from '@defuse-protocol/intents-sdk';
import { authIdentity, AuthMethod } from '@defuse-protocol/internal-utils';
import { fileURLToPath } from 'node:url';
import { parseUnits } from 'viem';
import { getTokenById, Token } from './get-tokens-list';
import { intentsSdk } from './utils/config';
import { getSigner } from './utils/signer';

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
  // Build withdrawal intents using the InternalTransfer route
  // This tells the system to keep the tokens inside intents (not bridge to external chain)
  const withdrawalIntents = await intentsSdk.createWithdrawalIntents({
    withdrawalParams: {
      assetId: token.assetId, // Token to transfer (e.g. "nep141:wrap.near")
      amount: BigInt(amount), // Amount in smallest unit (e.g. yoctoNEAR)
      destinationAddress: authIdentity.authHandleToIntentsUserId(
        toAddress,
        AuthMethod.EVM, // Recipient address type — use AuthMethod.Near for NEAR addresses
      ),
      destinationMemo: undefined, // No memo needed for internal transfers
      feeInclusive: false, // Amount specified is the exact amount to send (fee added on top)
      routeConfig: createInternalTransferRoute(), // Stay inside intents — no bridge involved
    },
    feeEstimation: {
      amount: 0n, // Internal transfers have zero fees
      quote: null,
      underlyingFees: {
        [RouteEnum.InternalTransfer]: null,
      },
    },
  });

  // Attach your wallet signer to the SDK instance
  intentsSdk.setIntentSigner(signer);

  // Sign the intent with your wallet and broadcast it to the solver network
  const { intentHash } = await intentsSdk.signAndSendIntent({
    intents: withdrawalIntents,
  });

  // Wait for the intent to be settled on-chain (usually < 1 second for internal transfers)
  const { hash } = await intentsSdk.waitForIntentSettlement({ intentHash });
  return {
    txHash: hash,
  };
};

// ── Configuration ──────────────────────────────────────────────────────────────
const tokenId = 'nep141:wrap.near'; // Token to transfer
const amount = '0.1'; // Human-readable amount
const toAddress = authIdentity.authHandleToIntentsUserId(
  '0xxxxxx', // Replace with actual recipient EVM address
  AuthMethod.EVM,
);

async function main() {
  // Look up token metadata from the registry
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

  // Convert human-readable amount to smallest unit using token's decimals
  const amountIn = parseUnits(amount, token.decimals).toString();

  // Auto-detect signer type (NEAR or EVM) based on which .env key is set
  const { signer } = await getSigner();
  if (!signer) {
    throw new Error('Signer not found');
  }

  const txHash = await transferToken({
    token,
    amount: amountIn,
    toAddress,
    signer,
  });
  console.log('Transfer submitted:');
  console.log(JSON.stringify(txHash, null, 2));
}

// Only run when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
