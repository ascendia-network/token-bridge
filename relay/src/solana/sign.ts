import nacl from "tweetnacl";
import bs58 from "bs58";
import { decodeUTF8 } from "tweetnacl-util";
import { accountSolana } from "../config";
import { ReceiptWithMeta } from "../typeValidators";

export async function signReceiptForSolana(
  receiptWithMeta: ReceiptWithMeta
): Promise<string | undefined> {
  throw new Error("Solana signing not implemented.");
  const receipt = receiptWithMeta.receipts;
  const messageBytes = decodeUTF8(message);
  const signatureBytes = nacl.sign.detached(messageBytes, accountSolana.secretKey);
  const signature = bs58.encode(signatureBytes);
  return signature;
}
