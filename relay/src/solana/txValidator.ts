import { Connection } from "@solana/web3.js";
import { rpcConfig } from "../config";
import { type ReceiptMetaSolana, type ReceiptWithMeta } from "../typeValidators";
import { bridgeIdl } from "./idl/bridgeIdl";

export async function validateExistingTransactionSolana(
  receiptWithMeta: ReceiptWithMeta
): Promise<void> {
  throw new Error("Solana validation not implemented.");
  const receiptMeta: ReceiptMetaSolana | undefined =
    receiptWithMeta.receiptsMeta as ReceiptMetaSolana | undefined;
  if (!receiptMeta) {
    throw new Error("Receipt metadata is required for validation.");
  }
  const connection = new Connection(rpcConfig.RPC_URL_SOLANA, "confirmed");
  const receipt = await connection.getParsedTransaction(receiptMeta.transactionHash);
  if (!receipt) {
    throw new Error(
      `Receipt for transaction hash ${receiptMeta.transactionHash} not found.`
    );
  }
  
}

export default validateExistingTransactionSolana;
