import { Hex } from "viem";

export interface SendPayloadEVM {
  destChainId: bigint;
  tokenAddress: Hex;
  externalTokenAddress: Hex;
  amountToSend: bigint;
  feeAmount: bigint;
  timestamp: number | bigint;
  flags: bigint;
  flagData: Hex | "";
};

export interface SendPayloadCall {
  recipient: Hex;
  payload: SendPayloadEVM;
  payloadSignature: Hex;
  // Permit optional fields
  _deadline?: bigint;
  v?: bigint;
  r?: Hex;
  s?: Hex;
};
