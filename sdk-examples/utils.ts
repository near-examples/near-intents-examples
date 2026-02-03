import { BlockId, BlockReference, Finality } from "near-api-js";
import { z } from "zod";
import { nearJsonRpcProvider } from "./config/near";

/*
 * Shared helpers for NEAR view calls and response decoding.
 */

/**
 * Decode a NEAR RPC `call_function` response into a typed value using Zod.
 */
export function decodeQueryResult<T>(
  response: unknown,
  schema: z.ZodType<T>
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
 * Build a block reference for RPC queries, defaulting to optimistic finality.
 */
function getBlockReference({
  blockId,
  finality,
}: OptionalBlockReference): BlockReference {
  if (blockId != null) {
    return { blockId };
  }

  if (finality != null) {
    return { finality };
  }

  return { finality: "optimistic" };
}

/**
 * Query a NEAR contract view method and return the decoded result.
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
  const response = await nearJsonRpcProvider.query({
    request_type: "call_function",
    account_id: contractId,
    args_base64: btoa(JSON.stringify(args)),
    method_name: methodName,
    finality: "final",
  });

  return decodeQueryResult(response, z.unknown());
};
