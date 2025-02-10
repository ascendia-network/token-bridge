import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";

export type ParsedReceipt = {
  from: string;
  to: string;
  tokenAddress: string;
  amount: string;
  chainFrom: string;
  chainTo: string;
  eventId: string;
  flags: string;
  data: any;
};

export const abi = [
  "event TokenLocked((bytes32 from, bytes32 to, bytes32 tokenAddress, uint256 amount, uint256 chainFrom, uint256 chainTo, uint256 eventId, uint256 flags, bytes data))",
];

export async function fetchAndParseTransaction(
  provider: ethers.JsonRpcProvider,
  txHash: string,
  confirmations: number,
): Promise<ParsedReceipt> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || (await receipt.confirmations()) < confirmations) {
    return;
  }

  const contractInterface = new ethers.Interface(abi);

  for (const log of receipt.logs) {
    try {
      const parsedLog = contractInterface.parseLog(log);
      if (parsedLog && parsedLog.name === "TokenLocked") {
        const eventData = parsedLog.args[0];
        const parsedReceipt: ParsedReceipt = {
          from: eventData.from,
          to: eventData.to,
          tokenAddress: eventData.tokenAddress,
          amount: eventData.amount.toString(),
          chainFrom: eventData.chainFrom.toString(),
          chainTo: eventData.chainTo.toString(),
          eventId: eventData.eventId.toString(),
          flags: eventData.flags.toString(),
          data: eventData.data,
        };
        return parsedReceipt;
      }
    } catch (error) {}
  }
}

export async function signMessage(
  message: string,
  keypair: Keypair,
): Promise<Uint8Array> {
  const signature: Uint8Array = nacl.sign.detached(
    new TextEncoder().encode(message),
    keypair.secretKey,
  );
  return signature;
}
