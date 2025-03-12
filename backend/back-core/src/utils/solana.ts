import { Buffer } from "buffer";
import * as borsh from "borsh";
import * as bip39 from "bip39";
import { z } from "zod";
import { Keypair } from "@solana/web3.js";
import { HDKey } from "micro-key-producer/slip10.js";

const _b20 = { array: { type: "u8", len: 20 } };
const _b32 = { array: { type: "u8", len: 32 } };
const serialize = (value: any, schema: any) =>
  Buffer.from(borsh.serialize({ struct: schema }, value));

export const SendPayload = z.object({
  tokenAddressFrom: z.instanceof(Uint8Array).refine((v) => v.length === 32),
  tokenAddressTo: z.instanceof(Uint8Array).refine((v) => v.length === 20),
  amountToSend: z.coerce.bigint().max(2n ** 64n - 1n),
  feeAmount: z.coerce.bigint().max(2n ** 64n - 1n),
  chainFrom: z.coerce.bigint().max(2n ** 64n - 1n),
  timestamp: z.coerce.bigint().max(2n ** 64n - 1n),
  flags: z.instanceof(Uint8Array).refine((v) => v.length === 32),
  flagData: z.instanceof(Uint8Array),
});

export type SendPayload = z.infer<typeof SendPayload>;

const sendSchema = {
  tokenAddressFrom: _b32,
  tokenAddressTo: _b20,
  amountToSend: "u64",
  feeAmount: "u64",
  chainFrom: "u64",
  timestamp: "u64",
  flags: _b32,
  flagData: { array: { type: "u8" } }
};

export const ReceivePayload = z.object({
  to: z.instanceof(Uint8Array).refine((v) => v.length === 32),
  tokenAddressTo: z.instanceof(Uint8Array).refine((v) => v.length === 32),
  amountTo: z.coerce.bigint().max(2n ** 64n - 1n),
  chainTo: z.coerce.bigint().max(2n ** 64n - 1n),
  flags: z.instanceof(Uint8Array).refine((v) => v.length === 32),
  flagData: z.instanceof(Uint8Array),
});

export type ReceivePayload = z.infer<typeof ReceivePayload>;

const receiveSchema = {
  to: _b32,
  tokenAddressTo: _b32,
  amountTo: "u64",
  chainTo: "u64",
  flags: _b32,
  flagData: { array: { type: "u8" } }
};

export const serializeSendPayload = (value: SendPayload) =>
  serialize(value, sendSchema);
export const serializeReceivePayload = (value: ReceivePayload) =>
  serialize(value, receiveSchema);

export function getSolanaAccount(mnemonic: string) {
  const path = "m/44'/501'/1'/0'";
  const seed = bip39.mnemonicToSeedSync(mnemonic, "");
  const hd = HDKey.fromMasterSeed(seed.toString("hex"));
  const keypair = Keypair.fromSeed(hd.derive(path).privateKey);
  return keypair;
}