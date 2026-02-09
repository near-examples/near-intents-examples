import { BlockId, Finality } from 'near-api-js';
import { z } from 'zod';
import { nearJsonRpcProvider } from '../config/near';

/**
 *  Blockchain Utilities
 *
 *  Helpers for querying NEAR smart contracts via RPC view calls.
 *  Used by `get-balances.ts` to read token balances from the `intents.near`
 *  verifier contract without requiring a signer or gas.
 *
 */

/**
 * Decode a NEAR RPC `call_function` response into a typed value using Zod.
 * The RPC returns the result as a byte array which is decoded to JSON.
 */
export function decodeQueryResult<T>(
  response: unknown,
  schema: z.ZodType<T>,
): T {
  const parsed = z.object({ result: z.array(z.number()) }).parse(response);
  const uint8Array = new Uint8Array(parsed.result);
  const decoder = new TextDecoder();
  const result = decoder.decode(uint8Array);
  return schema.parse(JSON.parse(result));
}

/**
 * Optional block reference for historical or finalized reads.
 */
export type OptionalBlockReference = {
  blockId?: BlockId;
  finality?: Finality;
};

/**
 * Query a NEAR contract view method and return the decoded result.
 * This is a read-only call that does not require gas or a signer.
 */
export const queryContract = async ({
  contractId,
  methodName,
  args,
}: {
  contractId: string;
  methodName: string;
  args: Record<string, unknown>;
}): Promise<unknown> => {
  // Make an RPC view call to the contract
  const response = await nearJsonRpcProvider.query({
    request_type: 'call_function',
    account_id: contractId,
    args_base64: btoa(JSON.stringify(args)),
    method_name: methodName,
    finality: 'final',
  });

  // Decode the byte-array response into a typed value
  return decodeQueryResult(response, z.unknown());
};
