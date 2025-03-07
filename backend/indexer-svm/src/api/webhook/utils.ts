/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */

import bs58 from "bs58";

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

export function safeHexToString(byteArray: Uint8Array): string {
  if (!byteArray || byteArray.length === 0) {
    return "";
  }
  return "0x" + Buffer.from(byteArray).toString("hex");
}

export function padTo32Bytes(byteArray: Uint8Array): Uint8Array {
  if (byteArray.length > 32) {
    throw new Error(`Size cannot exceed 32 bytes. Given size: ${byteArray.length} bytes.`);
  }
  return Uint8Array.from([...new Array(32 - byteArray.length).fill(0), ...byteArray]);
}

export function toHex(bs58String: string): string {
  return `0x${Buffer.from(bs58.decode(bs58String)).toString("hex")}`;
}