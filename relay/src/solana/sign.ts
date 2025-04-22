import nacl from "tweetnacl";
import { accountSolana } from "../config";
import { ReceiptWithMeta } from "../typeValidators";
import { ReceivePayload, serializeReceivePayload } from "./utils";
import { toBytes, bytesToHex } from "viem"
import { Hash } from "ox";

export async function signReceiptForSolana(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  const receipt = receiptWithMeta.receipts;
  const payload: ReceivePayload = {
    to: toBytes(receipt.to, { size: 32 }),
    tokenAddressTo: toBytes(receipt.tokenAddressTo, { size: 32 }),
    amountTo: receipt.amountTo,
    chainTo: receipt.chainTo,
    chainFrom: receipt.chainFrom,
    eventId: receipt.eventId,
    flags: toBytes(receipt.flags, { size: 32 }),
    flagData: toBytes(receipt.data),
  };
  const messageBytes = serializeReceivePayload(payload);
  const messageHashBytes = Hash.keccak256(messageBytes);
  const signatureBytes = nacl.sign.detached(
    messageHashBytes,
    accountSolana.secretKey
  );
  return bytesToHex(signatureBytes); // signature;
}
