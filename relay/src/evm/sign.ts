import { encodeAbiParameters, hashMessage, keccak256 } from "viem";
import { type ReceiptWithMeta } from "../typeValidators";
import { config } from "../config";

export async function signReceiptForEVM(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  const receipt = receiptWithMeta.receipts;
  const MiniReceiptAbi = {
    name: "receipt",
    type: "tuple",
    indexed: false,
    internalType: "struct BridgeTypes.MiniReceipt",
    components: [
      {
        name: "to",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "tokenAddressTo",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "amountTo",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "chainFrom",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "chainTo",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "eventId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "flags",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "data",
        type: "bytes",
        internalType: "bytes",
      },
    ],
  };
  const message = encodeAbiParameters<[typeof MiniReceiptAbi]>(
    [MiniReceiptAbi],
    [
      {
        to: receipt.to as `0x${string}`,
        tokenAddressTo: receipt.tokenAddressTo as `0x${string}`,
        amountTo: BigInt(receipt.amountTo),
        chainFrom: BigInt(receipt.chainFrom),
        chainTo: BigInt(receipt.chainTo),
        eventId: BigInt(receipt.eventId),
        flags: BigInt(receipt.flags),
        data: receipt.data as `0x${string}`,
      },
    ]
  );

  const messageHash = keccak256(message);
  const digest = hashMessage({ raw: messageHash });
  const signature = await config.accountEVM.signMessage({ message: digest });
  return signature;
}

export default signReceiptForEVM;
