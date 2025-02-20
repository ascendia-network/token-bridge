import { encodeAbiParameters, hashMessage, keccak256 } from "viem";
import { bridgeAbi } from "./abi/bridgeAbi";
import { validateExistingTransactionEVM } from "./txValidator";
import { type ReceiptWithMeta } from "../typeValidators";
import { accountEVM } from "../config";

export async function signReceiptForEVM(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  try {
    await validateExistingTransactionEVM(receiptWithMeta);
  } catch (error) {
    console.error("Error validating transaction:", error);
    return;
  }
  const receipt = receiptWithMeta.receipts;
  const MiniReceiptAbi = bridgeAbi.find(
    (abi) => abi.type === "function" && abi.name === "claim"
  )?.inputs[0];
  if (!MiniReceiptAbi) throw new Error("Receipt ABI not found");
  const message = encodeAbiParameters(MiniReceiptAbi.components, [
    receipt.to as `0x${string}`,
    receipt.tokenAddressTo as `0x${string}`,
    BigInt(receipt.amountTo),
    BigInt(receipt.chainFrom),
    BigInt(receipt.chainTo),
    BigInt(receipt.eventId),
    BigInt(receipt.flags),
    receipt.data as `0x${string}`,
  ]);

  const messageHash = keccak256(message);
  const digest = hashMessage({ raw: messageHash });
  const signature = await accountEVM.signMessage({ message: digest });
  return signature;
}

export default signReceiptForEVM;
