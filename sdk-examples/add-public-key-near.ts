/**
 *  Register Public Key with Intents (NEAR)
 *
 *  Registers your NEAR public key with the `intents.near` verifier contract.
 *  This is a one-time on-chain transaction — once registered, your key can sign
 *  intents (swaps, transfers, withdrawals) without further registration.
 *
 *  Why is this needed?
 *  -------------------
 *  The intents system verifies every signed intent against a registry of authorized keys.
 *  For NEAR wallets, this means your public key must be explicitly added to the contract
 *  before you can perform any operations. Think of it as "connecting your wallet" to the
 *  intents system — you only need to do it once per key.
 *
 *  EVM wallets don't need this step because ERC-191 signatures include the signer's address
 *  (recovered via ecrecover), so the contract can verify without pre-registration.
 *
 *  The script is idempotent: if the key is already registered, it exits early without
 *  making an on-chain transaction.
 *
 *  On-chain call details:
 *   - Contract:  intents.near
 *   - Method:    add_public_key({ public_key })
 *   - Gas:       5 TGas (5_000_000_000_000 gas units)
 *   - Deposit:   1 yoctoNEAR (required for storage staking)
 *
 *  Requires:  INTENTS_SDK_PRIVATE_KEY_NEAR in .env
 *  Run:       pnpm sdk/add-public-key-near
 *
 */

import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { hasPublicKey } from './get-public-key-near';
import {
  getAccountsForPublicKey,
  getNearIntentsSigner,
} from './utils/near-config';

async function main() {
  // Load the NEAR wallet from the private key in .env
  const { publicKey, walletClient } = await getNearIntentsSigner();

  // Look up all NEAR accounts associated with this public key (via FastNEAR indexer)
  const details = await getAccountsForPublicKey(publicKey);

  console.log('Public key details:', details);
  console.log(`Public key: ${publicKey}`);
  console.log(`Using account: ${walletClient.accountId}`);

  // Check if this key is already registered — avoid unnecessary on-chain calls
  const isRegistered = await hasPublicKey({
    accountId: walletClient.accountId,
    publicKey,
  });
  if (isRegistered) {
    console.log('Key is already registered. Nothing to do.');
    return;
  }

  // Register the public key with the intents.near verifier contract
  // This is an on-chain transaction that costs a small amount of gas + 1 yoctoNEAR deposit
  const result = await walletClient.account.callFunction({
    contractId: 'intents.near', // The core intents verifier contract
    methodName: 'add_public_key', // Registers a new authorized key
    args: { public_key: publicKey }, // Your ed25519 public key (e.g. "ed25519:ABC...")
    gas: 5_000_000_000_000n, // 5 TGas — more than enough for this simple call
    deposit: 1n, // 1 yoctoNEAR — required for storage staking on the contract
  });
  console.log('Registration successful.');
  console.log('Transaction:', JSON.stringify(result, null, 2));
}

// Only run when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
