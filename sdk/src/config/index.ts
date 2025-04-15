import { bytesToBigInt, stringToBytes } from "viem";
export let backendUrl = "http://localhost:3000";

export function setBackendUrl(url: string) {
  backendUrl = url;
}

export const SOLANA_CHAIN_ID = bytesToBigInt(
  stringToBytes("SOLANA", { size: 8 }),
);
export const SOLANA_DEV_CHAIN_ID = bytesToBigInt(
  stringToBytes("SOLANADN", { size: 8 }),
);