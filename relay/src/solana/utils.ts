/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */

import { Base58, Hex } from "ox";
import { Buffer } from "buffer";
import * as borsh from "borsh";

export function toHexFromBytes(byteArray: Uint8Array): string {
  return `0x${Buffer.from(padTo32Bytes(byteArray)).toString("hex")}`;
}

export function safeNumber(value: any): number {
  return Number(value?.toString()) || 0;
}

export function safeBigInt(value: Uint8Array): number {
  return Number(BigInt(`0x${Buffer.from(value).toString("hex")}`)) || 0;
}

export function safeHexToNumber(byteArray: Uint8Array): number {
  return parseInt(Buffer.from(byteArray).toString("hex"), 16) || 0;
}

export function padTo32Bytes(byteArray: Uint8Array): Uint8Array {
  if (byteArray.length > 32) {
    throw new Error(
      `Size cannot exceed 32 bytes. Given size: ${byteArray.length} bytes.`
    );
  }
  return Uint8Array.from([
    ...new Array(32 - byteArray.length).fill(0),
    ...byteArray,
  ]);
}

export function toHex(bs58String: string): string {
  return Hex.fromBytes(Base58.toBytes(bs58String));
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
  flags: Uint8Array;
  flagData: Uint8Array;
}

const receiveSchema = {
  to: _b32,
  tokenAddressTo: _b32,
  amountTo: "u64",
  chainTo: "u64",
  flags: _b32,
  flagData: { array: { type: "u8" } },
};

export const serializeSendPayload = (value: SendPayload) =>
  serialize(value, sendSchema);
export const serializeReceivePayload = (value: ReceivePayload) =>
  serialize(value, receiveSchema);