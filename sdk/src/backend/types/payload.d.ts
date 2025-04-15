import { type Hex } from "viem";

export interface SendPayload {
  chainFrom: bigint;
  chainTo: bigint;
  tokenAddressFrom: Hex;
  tokenAddressTo: Hex;
  amountToSend: bigint;
  feeAmount: bigint;
  timestamp: bigint;
  flags: bigint;
  flagData: Hex;
}

export interface SendPayloadResponse {
  sendPayload: SendPayload;
  signedBy: string;
  signature: Hex;
}
