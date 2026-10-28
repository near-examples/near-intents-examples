import { fileURLToPath } from 'node:url';
import { ApiError } from '@defuse-protocol/one-click-sdk-typescript';
import 'dotenv/config';
import { readSwapConfig } from './swap-config';
import { getQuote } from './2-get-quote';
import { sendTokens } from './3-send-deposit';
import { submitTxHash } from './4-submit-tx-hash-OPTIONAL';
import { pollStatusUntilSuccess } from './5-check-status-OPTIONAL';
import { displaySwapCostTable } from './utils';

/**
 *  Step 5: Full Swap Implementation
 *
 *  This combines steps 2 - 5:
 *   1. Get a quote with deposit address
 *   2. Send deposit to the quote's deposit address
 *   3. Submit transaction hash to 1-Click API
 *   4. Check the status of the swap
 *
 *  NOTE: Configure this file independently of the other files in this directory
 */

const defaultServices = {
  getQuote,
  sendTokens,
  submitTxHash,
  pollStatusUntilSuccess,
};

export async function fullSwap(
  env: NodeJS.ProcessEnv = process.env,
  services = defaultServices,
) {
  const { execute, senderAddress, senderPrivateKey, recipientAddress, amount } =
    readSwapConfig(env);
  const originAsset = 'nep141:wrap.near';
  const destinationAsset =
    'nep141:arb-0x912ce59144191c1204e64559fe8253a0e49e6548.omft.near';
  try {
    console.log('Starting NEAR Intents full swap process w/ 1-Click API...\n');

    // Step 1: Get quote and extract deposit address
    console.log('Step 1: Getting quote...');
    console.log('--------------------------------');
    const quote = await services.getQuote(
      !execute,
      senderAddress,
      recipientAddress,
      originAsset,
      destinationAsset,
      amount,
    );

    displaySwapCostTable(quote);
    if (!execute) {
      console.log(
        'Dry-run quote only. Set SWAP_EXECUTE=true to send the deposit.',
      );
      return { quote };
    }

    // Extract deposit address from quote response
    const depositAddress = quote.quote?.depositAddress;
    if (!depositAddress) {
      throw new Error('No deposit address found in quote response');
    }

    console.log(
      `💬 - Quote: ${quote.quote?.amountInFormatted} NEAR → ${quote.quote?.amountOutFormatted} ARB`,
    );
    console.log(`🎯 - Deposit address: ${depositAddress}`);

    // Step 2: Send deposit
    console.log('Step 2: Sending deposit...');
    console.log('--------------------------------');
    const depositResult = await services.sendTokens(
      senderAddress,
      senderPrivateKey,
      depositAddress,
      amount,
    );
    console.log('✅ - Deposit sent successfully!');
    console.log(
      `🔍 - See transaction: https://nearblocks.io/txns/${depositResult.transaction.hash}\n`,
    );

    // Step 3: Submit transaction hash
    console.log('Step 3: Submitting transaction hash...');
    console.log('--------------------------------');
    const submitResult = await services.submitTxHash(
      depositResult.transaction.hash,
      depositAddress,
    );
    console.log('✅ - Transaction hash submitted successfully!\n');

    // Step 4: Poll status until success
    console.log('Step 4: Monitoring swap status...');
    console.log('--------------------------------');
    console.log('⏳ Waiting 5 seconds before starting status checks...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const finalStatus = await services.pollStatusUntilSuccess(depositAddress);
    console.log('--------------------------------');
    console.log(`Swap finished with status: ${finalStatus.status}\n`);
    console.log(
      `🔍 View full transaction on NEAR Intents Explorer: \n https://explorer.near-intents.org/transactions/${depositAddress} \n`,
    );

    return { quote, depositAddress, depositResult, submitResult, finalStatus };
  } catch (error) {
    console.error('❌ Full swap failed:', error as ApiError);
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fullSwap().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
