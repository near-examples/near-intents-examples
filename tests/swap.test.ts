import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSwapConfig } from '../1click-example/swap-config';
import { fullSwap } from '../1click-example/6-full-swap';

const env = {
  SENDER_NEAR_ACCOUNT: 'sender.near',
  SWAP_RECIPIENT: '0x0123456789012345678901234567890123456789',
};

test('dry run needs no signing credential and never sends funds', async () => {
  let quoted = false;
  await fullSwap(env, {
    getQuote: async (dry, sender, recipient) => {
      assert.equal(dry, true);
      assert.equal(sender, env.SENDER_NEAR_ACCOUNT);
      assert.equal(recipient, env.SWAP_RECIPIENT);
      quoted = true;
      return { quote: {} } as never;
    },
    sendTokens: async () => assert.fail('dry run must not send funds'),
    submitTxHash: async () => assert.fail('dry run must not publish'),
    pollStatusUntilSuccess: async () => assert.fail('dry run must not poll'),
  });
  assert.equal(quoted, true);
});

test('live execution requires credentials and an explicit destination', () => {
  assert.throws(
    () => readSwapConfig({ ...env, SWAP_EXECUTE: 'true' }),
    /SENDER_PRIVATE_KEY/,
  );
  assert.throws(
    () => readSwapConfig({ SENDER_NEAR_ACCOUNT: 'sender.near' }),
    /SWAP_RECIPIENT/,
  );
  assert.throws(
    () => readSwapConfig({ ...env, SWAP_EXECUTE: 'yes' }),
    /true or false/,
  );
});

test('amounts remain exact in yoctoNEAR and reject zero or overprecision', () => {
  assert.equal(
    readSwapConfig({ ...env, SWAP_AMOUNT: '0.000000000000000000000001' })
      .amount,
    '1',
  );
  for (const amount of ['0', '-1', '1e3', '0.0000000000000000000000001']) {
    assert.throws(
      () => readSwapConfig({ ...env, SWAP_AMOUNT: amount }),
      /SWAP_AMOUNT/,
    );
  }
});
