import { z } from "zod";
import { Base58 } from "ox";

export const EvmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
export const SvmAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const signatureRegex = /^(0x|0X)?[a-fA-F0-9]{130}$/;
export const receiptIdRegex = /^[0-9]+-[0-9]+-[0-9]+$/;

export const evmAddressBytes32Hex = z
  .string()
  .regex(EvmAddressRegex)
  .transform((val) => {
    const processed = String(val);
    return `0x${processed.slice(2).padStart(64, "0")}` as `0x${string}`;
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
        message: "Not a valid Solana address",
      });
      // This is a special symbol you can use to
      // return early from the transform function.
      // It has type `never` so it does not affect the
      // inferred return type.
      return z.NEVER;
    }
    return hexAddress as `0x${string}`;
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
    }),
});

export const evmAddressValidatorSchema = z.object({
  address: z.string().regex(EvmAddressRegex),
});

export const svmAddressValidatorSchema = z.object({
  address: z.string().regex(SvmAddressRegex),
});

export const receiptIdValidatorSchema = z.object({
  receiptId: z
    .string()
    .regex(receiptIdRegex)
    .transform((val) => val as `${number}-${number}-${number}`),
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
    .optional(),
});

export const payloadEvmValidatorSchema = payloadValidatorSchema.extend({
  tokenAddress: evmAddressBytes32Hex,
});

export const payloadSvmValidatorSchema = payloadValidatorSchema.extend({
  tokenAddress: svmAddressBytes32Hex,
});
