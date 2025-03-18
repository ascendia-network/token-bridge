import { Address, Hex, PublicClient } from "viem";
import { bridgeAbi } from "../abi/bridgeAbi";
import { FullReceipt, MiniReceipt } from "../types/calls";
import { hashReceipt } from "./helpers";

export async function checkIsClaimed(
  receiptOrHash: FullReceipt | MiniReceipt | Hex,
  bridgeAddress: Address,
  publicClient: PublicClient
): Promise<boolean> {
  const hash =
    typeof receiptOrHash === "string"
      ? receiptOrHash
      : hashReceipt(receiptOrHash);
  return publicClient.readContract({
    address: bridgeAddress,
    abi: bridgeAbi,
    functionName: "isClaimed",
    args: [hash],
  }) as Promise<boolean>;
}

export async function amountAdditionalNativeToSend(
  bridgeAddress: Address,
  publicClient: PublicClient
): Promise<bigint> {
  return publicClient.readContract({
    address: bridgeAddress,
    abi: bridgeAbi,
    functionName: "nativeSendAmount",
    args: [],
  }) as Promise<bigint>;
}
