import { Hex } from "viem";

export const BridgeFlags = {
  // Send flags 0-64 (65 bits)
  SENDER_IS_TXORIGIN: 1n << 0n,
  SEND_WITH_PERMIT: 1n << 1n,
  SHOULD_WRAP: 1n << 2n,
  // Receive flags 65-128 (63 bits)
  SHOULD_UNWRAP: 1n << 65n,
  SEND_NATIVE_TO_RECEIVER: 1n << 66n,
  SHOULD_RESTAKE: 1n << 67n,
}
export type BridgeFlags = typeof BridgeFlags[keyof typeof BridgeFlags];

export interface SendPayloadEVM {
  chainFrom: bigint;
  chainTo: bigint;
  tokenAddress: Hex;
  externalTokenAddress: Hex;
  amountToSend: bigint;
  feeAmount: bigint;
  timestamp: number | bigint;
  flags: bigint;
  flagData: Hex;
}

export interface SendCall {
  recipient: Hex;
  payload: SendPayloadEVM;
  payloadSignature: Hex;
  // Permit optional fields
  _deadline?: bigint;
  v?: bigint;
  r?: Hex;
  s?: Hex;
}

export interface MiniReceipt {
  to: Hex;
  tokenAddressTo: Hex;
  amountTo: bigint;
  chainFrom: bigint;
  chainTo: bigint;
  eventId: bigint;
  flags: bigint;
  data: Hex;
}

export interface FullReceipt extends MiniReceipt {
  from: Hex;
  tokenAddressFrom: Hex;
  amountFrom: bigint;
}

export interface ClaimCall {
  receipt: FullReceipt | MiniReceipt;
  signature: Hex;
}
