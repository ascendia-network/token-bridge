import { encodePacked, keccak256 } from "viem";
import { type ReceiptWithMeta } from "../typeValidators";
import { config } from "../config";

export async function signReceiptForEVM(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  const receipt = receiptWithMeta.receipts;
  const message = encodePacked(
    [
      "bytes32",
      "bytes32",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "bytes",
    ],
    [
      receipt.to as `0x${string}`,
      receipt.tokenAddressTo as `0x${string}`,
      BigInt(receipt.amountTo),
      BigInt(receipt.chainFrom),
      BigInt(receipt.chainTo),
      BigInt(receipt.eventId),
      BigInt(receipt.flags),
      receipt.data === "" ? "0x" : receipt.data as `0x${string}`,
    ]
  );

  // const messageHash = keccak256(message);
  const signature = await config.accountEVM.signMessage({
    message: { raw: message },
  });
  return signature;
}

export default signReceiptForEVM;
