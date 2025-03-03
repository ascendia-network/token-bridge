import nacl from "tweetnacl";
import { accountSolana } from "../config";
import { ReceiptWithMeta } from "../typeValidators";
import { ReceivePayload, serializeReceivePayload } from "./utils";
import { validateExistingTransactionSolana } from "./txValidator";

export async function signReceiptForSolana(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  const receipt = receiptWithMeta.receipts;
  try {
      await validateExistingTransactionSolana(receiptWithMeta);
    } catch (error) {
      console.error("Error validating transaction:", error);
      return;
    }
  const payload: ReceivePayload = {
    to: Buffer.from(receipt.to, "hex"),
    tokenAddressTo: Buffer.from(receipt.tokenAddressTo, "hex"),
    amountTo: Number.parseInt(receipt.amountTo.toString()),
    chainTo: BigInt(receipt.chainTo),
    flags: Buffer.from(receipt.flags.toString(16), "hex"),
    flagData: Buffer.from(receipt.data, "hex"),
  };
  const messageBytes = serializeReceivePayload(payload);
  const signatureBytes = nacl.sign.detached(messageBytes, accountSolana.secretKey);
  return Buffer.from(signatureBytes).toString("hex") as `0x${string}`; // signature;
}
