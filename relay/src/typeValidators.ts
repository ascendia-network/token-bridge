import { z } from "zod";
import bs58 from "bs58";

const MiniReceipt = z.object({
  to: z.string().regex(/0x[0-9a-fA-F]{64}/),
  tokenAddressTo: z.string().regex(/0x[0-9a-fA-F]{64}/),
  amountTo: z.coerce.bigint(),
  chainFrom: z.coerce.bigint(),
  chainTo: z.coerce.bigint(),
  eventId: z.coerce.bigint(),
  flags: z.coerce.bigint(),
  data: z
    .string()
    .regex(/0x[0-9a-fA-F]*/)
    .or(z.string().min(0)),
});

const FullReceipt = MiniReceipt.extend({
  from: z.string().regex(/0x[0-9a-fA-F]{64}/),
  tokenAddressFrom: z.string().regex(/0x[0-9a-fA-F]{64}/),
  amountFrom: z.coerce.bigint(),
});

const ReceiptMeta = z.object({
  receiptId: z.string().regex(/[0-9]+_[0-9]+_[0-9]+/),
  blockHash: z.string().nullable(),
  blockNumber: z.coerce.bigint(),
  timestamp: z.coerce.bigint(),
  transactionIndex: z.coerce.number(),
  transactionHash: z
    .string()
    .regex(/0x[0-9a-fA-F]{64}/)
    .transform((val) => val as `0x${string}`)
    .or(
      z
        .string()
        .regex(/[1-9A-HJ-NP-Za-km-z]{87,88}/)
        .refine(
          (val) => bs58.decode(val).length === 64,
          "Invalid base58 encoded transaction hash"
        )
    ),
});

const FullReceiptDB = FullReceipt.extend({
  receiptId: z.string().regex(/[0-9]+_[0-9]+_[0-9]+/),
  timestamp: z.coerce.bigint(),
  bridgeAddress: z.coerce.string(),
});

const MiniReceiptDB = MiniReceipt.extend({
  receiptId: z.string().regex(/[0-9]+_[0-9]+_[0-9]+/),
  timestamp: z.coerce.bigint(),
  bridgeAddress: z.string(),
});

const ReceiptWithMeta = z.object({
  receipts: FullReceiptDB,
  receiptsMeta: ReceiptMeta.nullable(),
});

const ReceiptsToSignResponse = z.array(ReceiptWithMeta);

export const validators = {
  FullReceipt,
  MiniReceipt,
  FullReceiptDB,
  MiniReceiptDB,
  ReceiptMeta,
  ReceiptWithMeta,
  ReceiptsToSignResponse,
};

export type FullReceipt = z.infer<typeof FullReceipt>;
export type MiniReceipt = z.infer<typeof MiniReceipt>;
export type ReceiptMeta = z.infer<typeof ReceiptMeta>;
export type FullReceiptDB = z.infer<typeof FullReceiptDB>;
export type MiniReceiptDB = z.infer<typeof MiniReceiptDB>;
export type ReceiptWithMeta = z.infer<typeof ReceiptWithMeta>;
export type ReceiptsToSignResponse = z.infer<typeof ReceiptsToSignResponse>;

export default validators;
