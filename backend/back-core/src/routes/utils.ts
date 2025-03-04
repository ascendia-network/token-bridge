import { z } from "zod";
import "zod-openapi/extend";
import { Base58 } from "ox";
import { receipt } from "../db/schema/core.schema";
import { receiptsMetaInIndexerEvm } from "../db/schema/evm.schema";
import { receiptsMetaInIndexerSolana } from "../db/schema/solana.schema";
import { createSelectSchema } from "drizzle-zod";

export const EvmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
export const SvmAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const signatureRegex = /^(0x|0X)?[a-fA-F0-9]{130}$/;
export const receiptIdRegex = /^[0-9]+_[0-9]+_[0-9]+$/;

export const evmAddressBytes32Hex = z
  .string()
  .regex(EvmAddressRegex)
  .transform((val) => {
    const processed = String(val);
    return `0x${processed.slice(2).padStart(64, "0")}` as `0x${string}`;
  })
  .openapi({
    type: "string",
    description: "EVM address in bytes32 hex format",
    example: "0x000000000000000000000000C6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
  });

export const svmAddressBytes32Hex = z
  .string()
  .regex(SvmAddressRegex)
  .transform((val, ctx) => {
    const processed = String(val);
    const hexAddress = Base58.toHex(processed);
    if (hexAddress.length !== 64 + 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Not a valid Solana address"
      });
      // This is a special symbol you can use to
      // return early from the transform function.
      // It has type `never` so it does not affect the
      // inferred return type.
      return z.NEVER;
    }
    return hexAddress as `0x${string}`;
  }).openapi({
    type: "string",
    description: "Solana base58 address in bytes32 hex format",
    example:
      "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
  });

export const signRequestValidatorSchema = z.object({
  signature: z
    .string()
    .regex(signatureRegex)
    .transform((val) => {
      const processed = String(val);
      if (processed.startsWith("0X") || processed.startsWith("0x")) {
        return processed.slice(2);
      }
      return `0x${processed}` as `0x${string}`;
    })
});

export const evmAddressValidatorSchema = z.object({
  address: z
    .string()
    .regex(EvmAddressRegex)
    .openapi({
      type: "string",
      description: "EVM address",
      example: "0xe0b52EC5cE3e124ab5306ea42463bE85aeb5eDDd",
    }),
});

export const svmAddressValidatorSchema = z.object({
  address: z.string().regex(SvmAddressRegex).openapi({
    type: "string",
    description: "Solana base58 address",
    example: "FMYR5BFh3JapZS1cfwYViiBMYJxFGwKdchnghBnBtxkk",
  }),
});

export const receiptIdValidatorSchema = z.object({
  receiptId: z
    .string()
    .regex(receiptIdRegex)
    .transform((val) => val as `${number}_${number}_${number}`).openapi({
      type: "string",
      description: "Receipt ID as 'chainFrom_chainTo_receiptId'",
      example: "1_22040_3",
    })
});

export const payloadValidatorSchema = z.object({
  tokenAddress: z.string().regex(/^(0x)?[a-fA-F0-9]{64}$/),
  amount: z.coerce.bigint(),
  flags: z.coerce.bigint(),
  flagData: z
    .string()
    .regex(/^(0x|0X)?[a-fA-F0-9]+$/)
    .transform((val) => {
      const processed = String(val);
      if (processed.startsWith("0X") || processed.startsWith("0x")) {
        return processed.slice(2);
      }
      return `0x${processed}` as `0x${string}`;
    })
    .optional()
});

export const payloadEvmValidatorSchema = payloadValidatorSchema.extend({
  tokenAddress: evmAddressBytes32Hex
});

export const payloadSvmValidatorSchema = payloadValidatorSchema.extend({
  tokenAddress: svmAddressBytes32Hex
});


export const sendSignatureQuerySchema = z.object({
  networkFrom: z.string().min(1, "networkFrom is required"),
  networkTo: z.string().min(1, "networkTo is required"),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address"),
  amount: z.string().min(1, "amount is required"),
  isMaxAmount: z
    .string()
    .regex(/^(true|false)$/, "isMaxAmount must be 'true' or 'false'")
    .transform((val) => val === "true"),
  externalTokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid external token address")
});

export const unsignedReceiptsResponseSchema = z.array(
  z.object({
    receipts: createSelectSchema(receipt),
    receiptsMeta: z.union([createSelectSchema(receiptsMetaInIndexerEvm), createSelectSchema(receiptsMetaInIndexerSolana)])
  })
);

export const receiptResponseSchema = createSelectSchema(receipt);

export const SendPayload = z.object({
  destChainId: z.bigint(),
  tokenAddress: z.string(),
  externalTokenAddress: z.string(),
  amountToSend: z.bigint(),
  feeAmount: z.bigint(),
  timestamp: z.number(),
  flags: z.bigint(),
  flagData: z.string()
})

export type SendPayload = z.infer<typeof SendPayload>;

export const sendPayloadResponseSchema = z.object({
  sendPayload: SendPayload,
  signature: z.string()
});
