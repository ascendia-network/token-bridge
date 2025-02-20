import { z } from "zod";
import bs58 from "bs58";


const MiniReceipt = z.object({
  to: z.string().regex(/0x[0-9a-fA-F]{64}/),
  tokenAddressTo: z.string().regex(/0x[0-9a-fA-F]{64}/),
  amountTo: z.bigint(),
  chainFrom: z.bigint(),
  chainTo: z.bigint(),
  eventId: z.bigint(),
  flags: z.bigint(),
  data: z.string().regex(/0x[0-9a-fA-F]*/),
});

const FullReceipt = MiniReceipt.extend({
  from: z.string().regex(/0x[0-9a-fA-F]{64}/),
  tokenAddressFrom: z.string().regex(/0x[0-9a-fA-F]{64}/),
  amountFrom: z.bigint(),
});

const ReceiptMeta = z.object({
  receiptId: z.string().regex(/[0-9]+_[0-9]+_[0-9]+/),
  blockHash: z.string().nullable(),
  blockNumber: z.bigint(),
  timestamp: z.bigint(),
  transactionIndex: z.number(),
});

const ReceiptMetaEVM = ReceiptMeta.extend({
  transactionHash: z
    .string()
    .regex(/0x[0-9a-fA-F]{64}/)
    .transform((val) => val as `0x${string}`),
});

const ReceiptMetaSolana = ReceiptMeta.extend({
  transactionHash: z
    .string()
    .regex(/[1-9A-HJ-NP-Za-km-z]{87,88}/).refine(
      (val) => bs58.decode(val).length === 64,
      "Invalid base58 encoded transaction hash"
    )
});

const FullReceiptDB = FullReceipt.extend({
  receiptId: z.string().regex(/[0-9]+_[0-9]+_[0-9]+/),
  timestamp: z.bigint(),
  bridgeAddress: z.string(),
});

const MiniReceiptDB = MiniReceipt.extend({
  receiptId: z.string().regex(/[0-9]+_[0-9]+_[0-9]+/),
  timestamp: z.bigint(),
  bridgeAddress: z.string(),
});

const ReceiptWithMeta = z.object({
  receipts: FullReceiptDB,
  receiptsMeta: z.union([ReceiptMetaSolana, ReceiptMetaEVM]).nullable(),
});

const ReceiptsToSignResponse = z.array(ReceiptWithMeta);

export const validators = {
  FullReceipt,
  MiniReceipt,
  FullReceiptDB,
  MiniReceiptDB,
  ReceiptMetaSolana,
  ReceiptMetaEVM,
  ReceiptWithMeta,
  ReceiptsToSignResponse,
};

export type FullReceipt = z.infer<typeof FullReceipt>;
export type MiniReceipt = z.infer<typeof MiniReceipt>;
export type ReceiptMetaEVM = z.infer<typeof ReceiptMetaEVM>;
export type ReceiptMetaSolana = z.infer<typeof ReceiptMetaSolana>;
export type FullReceiptDB = z.infer<typeof FullReceiptDB>;
export type MiniReceiptDB = z.infer<typeof MiniReceiptDB>;
export type ReceiptWithMeta = z.infer<typeof ReceiptWithMeta>;
export type ReceiptsToSignResponse = z.infer<typeof ReceiptsToSignResponse>;

export default validators;
