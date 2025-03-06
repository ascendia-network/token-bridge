import nacl from "tweetnacl";
import { accountSolana } from "../config";
import { ReceiptWithMeta } from "../typeValidators";
import { ReceivePayload, serializeReceivePayload } from "./utils";
import { toBytes, bytesToHex } from "viem"

export async function signReceiptForSolana(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  const receipt = receiptWithMeta.receipts;
  const payload: ReceivePayload = {
    to: toBytes(receipt.to, { size: 32 }),
    tokenAddressTo: toBytes(receipt.tokenAddressTo, { size: 32 }),
    amountTo: Number.parseInt(receipt.amountTo.toString()),
    chainTo: receipt.chainTo,
    flags: toBytes(receipt.flags, { size: 32 }),
    flagData: toBytes(receipt.data),
  };
  const messageBytes = serializeReceivePayload(payload);
  const signatureBytes = nacl.sign.detached(messageBytes, accountSolana.secretKey);
  return bytesToHex(signatureBytes); // signature;
}
