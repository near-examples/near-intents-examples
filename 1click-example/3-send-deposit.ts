import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { NEAR } from 'near-api-js/tokens';
import { getAccount } from './near';

/**
 *  Step 3: Send Deposit to Quote Address
 *
 *  This process sends $NEAR tokens to the `depositAddress`
 *
 *  It's important to note that although this example uses $NEAR, you can send any token on any
 *  supported network by the 1-Click API. No NEAR account is required to use 1Click API.
 *
 *  For example, if you use $ARB `assetId` as the `originAsset` in the quote, you will get an $ARB `depositAddress`
 *  in the quote response. You can then send $ARB to this `depositAddress` on Arbitrum to execute the swap.
 *
 */

// Configure token deposit
const senderAccount = process.env.SENDER_NEAR_ACCOUNT as string;
const senderPrivateKey = process.env.SENDER_PRIVATE_KEY as string;
const depositAmount = NEAR.toUnits('0.001').toString();
export const depositAddress = process.env.DEPOSIT_ADDRESS ?? ''; // deposit address from your live quote

export async function sendTokens(
  senderAccount: string,
  senderPrivateKey: string,
  depositAddress: string,
  depositAmount: string,
) {
  try {
    if (!senderAccount || !senderPrivateKey || !depositAddress)
      throw new Error(
        'Set sender credentials and DEPOSIT_ADDRESS from your quote',
      );
    const account = await getAccount(senderAccount, senderPrivateKey);
    const result = await account.transfer({
      token: NEAR,
      amount: depositAmount,
      receiverId: depositAddress as string,
    });

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Only run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.env.SWAP_EXECUTE !== 'true')
    throw new Error('Set SWAP_EXECUTE=true to send a deposit');
  sendTokens(senderAccount, senderPrivateKey, depositAddress, depositAmount)
    .then((result) =>
      console.log(
        `\nDeposit sent! \n See transaction: https://nearblocks.io/txns/${result.transaction.hash}`,
      ),
    )
    .catch(console.error);
}
