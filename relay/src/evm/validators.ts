import { z } from "zod";
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

const RPCValidator = z.string().url("Invalid RPC URL");

const RPCConfig = z.record(z.string().regex(/RPC_URL_[0-9]+/), RPCValidator);

const EnvConfig = z.object({
  BACKEND_URL: z
    .string()
    .url("Invalid backend URL")
    .default("http://localhost:3000"),
  EVM_PRIVATE_KEY: z
    .string()
    .regex(/0x[0-9a-fA-F]{64}/, "Invalid private key format")
    .nonempty("Private key is required")
    .readonly()
    .transform((val) => val as `0x${string}`),
  POLLING_INTERVAL: z
    .number()
    .int("Polling interval must be an integer")
    .positive("Polling interval must be positive")
    .min(1000, "Polling interval must be at least 1000ms")
    .default(5000),
});

export const config = EnvConfig.parse(process.env);
export const rpcConfig = RPCConfig.parse(process.env);

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
  transactionHash: z
    .string()
    .regex(/0x[0-9a-fA-F]{64}/)
    .transform((val) => val as `0x${string}`),
  transactionIndex: z.number(),
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
  receiptsMeta: ReceiptMeta.nullable(),
});

const ReceiptsToSignResponse = z.array(ReceiptWithMeta);

export const validators = {
  FullReceipt,
  MiniReceipt,
  ReceiptMeta,
  FullReceiptDB,
  MiniReceiptDB,
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
