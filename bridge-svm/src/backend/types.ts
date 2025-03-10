import { Buffer } from "buffer";
import * as borsh from "borsh";
import { PublicKey } from "@solana/web3.js";

export interface BackendSignature {
  message: Uint8Array;
  signers: Uint8Array[];
  signatures: Uint8Array[];
}

export type SignedPayload<T> = {
  payload: T;
  serializedPayload: Buffer;
  signature: BackendSignature;
};

export interface IBackend {
  getReceivePayload(...args: any[]): Promise<SignedPayload<ReceivePayload>>;

  getSendPayload(
    tokenAddressFrom: PublicKey,
    tokenAddressTo: string,
    amountToSend: number,
    flags: any
  ): Promise<SignedPayload<SendPayload>>;
}

const _b20 = { array: { type: "u8", len: 20 } };
const _b32 = { array: { type: "u8", len: 32 } };
const serialize = (value: any, schema: any) =>
  Buffer.from(borsh.serialize({ struct: schema }, value));

export interface SendPayload {
  tokenAddressFrom: Uint8Array;
  tokenAddressTo: Uint8Array;
  amountToSend: number;
  feeAmount: number;
  chainFrom: number | bigint;
  timestamp: number;
  flags: Uint8Array;
  flagData: Uint8Array;
}

const sendSchema = {
  tokenAddressFrom: _b32,
  tokenAddressTo: _b20,
  amountToSend: "u64",
  feeAmount: "u64",
  chainFrom: "u64",
  timestamp: "u64",
  flags: _b32,
  flagData: { array: { type: "u8" } },
};

export interface ReceivePayload {
  to: Uint8Array;
  tokenAddressTo: Uint8Array;
  amountTo: number;
  chainTo: number | bigint;
  eventId: number;
  flags: Uint8Array;
  flagData: Uint8Array;
}

const receiveSchema = {
  to: _b32,
  tokenAddressTo: _b32,
  amountTo: "u64",
  chainTo: "u64",
  eventId: "u64",
  flags: _b32,
  flagData: { array: { type: "u8" } },
};

export const serializeSendPayload = (value: SendPayload) =>
  serialize(value, sendSchema);
export const serializeReceivePayload = (value: ReceivePayload) =>
  serialize(value, receiveSchema);
