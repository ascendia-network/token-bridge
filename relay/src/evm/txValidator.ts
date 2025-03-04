import { createPublicClient, decodeAbiParameters, http } from "viem";
import { config } from "../config";
import { type ReceiptMetaEVM, type ReceiptWithMeta } from "../typeValidators";
import { bridgeAbi } from "./abi/bridgeAbi";

export async function validateExistingTransactionEVM(
  receiptWithMeta: ReceiptWithMeta
): Promise<void> {
  const receiptMeta: ReceiptMetaEVM | undefined =
    receiptWithMeta.receiptsMeta as ReceiptMetaEVM | undefined;
  if (!receiptMeta) {
    throw new Error("Receipt metadata is required for validation.");
  }
  const rpcFrom =
    config.rpcConfig[`RPC_URL_${receiptWithMeta.receipts.chainFrom}`];
  if (!rpcFrom) {
    throw new Error(
      `RPC URL for chain ${receiptWithMeta.receipts.chainFrom} not found.`
    );
  }
  const publicClient = createPublicClient({
    transport: http(rpcFrom),
  });
  const receipt = await publicClient.getTransactionReceipt({
    hash: receiptMeta.transactionHash,
  });
  if (!receipt) {
    throw new Error(
      `Receipt for transaction hash ${receiptMeta.transactionHash} not found.`
    );
  }

  const logFound = receipt.logs.find(
    (log) => log.transactionHash === receiptMeta.transactionHash
  );
  if (!logFound) {
    throw new Error(
      `Event log for transaction hash ${receiptMeta.transactionHash} not found.`
    );
  }
  const ReceiptAbi = bridgeAbi.find(
    (abi) => abi.type === "event" && abi.name === "TokenLocked"
  )?.inputs;
  if (!ReceiptAbi) throw new Error("Receipt ABI not found");
  const parsedLog = decodeAbiParameters(ReceiptAbi, logFound.data);

  if (
    parsedLog[0].to !== receiptWithMeta.receipts.to ||
    parsedLog[0].tokenAddressTo !== receiptWithMeta.receipts.tokenAddressTo ||
    parsedLog[0].amountTo !== receiptWithMeta.receipts.amountTo ||
    parsedLog[0].chainFrom !== receiptWithMeta.receipts.chainFrom ||
    parsedLog[0].chainTo !== receiptWithMeta.receipts.chainTo ||
    parsedLog[0].eventId !== receiptWithMeta.receipts.eventId ||
    parsedLog[0].flags !== receiptWithMeta.receipts.flags ||
    parsedLog[0].data !== receiptWithMeta.receipts.data
  ) {
    throw new Error(
      `Log data does not match receipt for transaction hash ${receiptMeta.transactionHash}.`
    );
  }
  console.log(`Transaction ${receiptMeta.transactionHash} is valid.`);
}

export default validateExistingTransactionEVM;
