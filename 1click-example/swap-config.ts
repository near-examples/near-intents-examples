import { NEAR } from 'near-api-js/tokens';

/** Read explicit destinations; quotes are dry-run unless execution is requested. */
export function readSwapConfig(env: NodeJS.ProcessEnv = process.env) {
  const flag = env.SWAP_EXECUTE ?? 'false';
  if (flag !== 'true' && flag !== 'false')
    throw new Error('SWAP_EXECUTE must be true or false');
  const execute = flag === 'true';
  const senderAddress = env.SENDER_NEAR_ACCOUNT?.trim();
  const recipientAddress = env.SWAP_RECIPIENT?.trim();
  if (!senderAddress) throw new Error('SENDER_NEAR_ACCOUNT is required');
  if (!recipientAddress) throw new Error('SWAP_RECIPIENT is required');
  if (execute && !env.SENDER_PRIVATE_KEY)
    throw new Error('SENDER_PRIVATE_KEY is required for execution');
  const input = env.SWAP_AMOUNT ?? '0.01';
  if (!/^\d+(?:\.\d{1,24})?$/.test(input))
    throw new Error(
      'SWAP_AMOUNT must be a positive NEAR decimal with at most 24 places',
    );
  const amount = NEAR.toUnits(input).toString();
  if (BigInt(amount) <= 0n) throw new Error('SWAP_AMOUNT must be positive');
  return {
    execute,
    senderAddress,
    recipientAddress,
    amount,
    senderPrivateKey: env.SENDER_PRIVATE_KEY ?? '',
  };
}
