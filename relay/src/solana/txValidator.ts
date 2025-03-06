import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { type ReceiptMetaSolana, type ReceiptWithMeta } from "../typeValidators";
import { bridgeIdl } from "./idl/bridgeIdl";
import { BorshCoder, EventParser, Program } from "@coral-xyz/anchor";
import * as utils from "./utils";

export async function validateExistingTransactionSolana(
  receiptWithMeta: ReceiptWithMeta
): Promise<void> {
  const receiptMeta: ReceiptMetaSolana | undefined =
    receiptWithMeta.receiptsMeta as ReceiptMetaSolana | undefined;
  if (!receiptMeta) {
    throw new Error("Receipt metadata is required for validation.");
  }
  const connection = config.rpcConfig[`RPC_URL_${receiptWithMeta.receipts.chainFrom}`] as Connection;
  const receipt = await connection.getParsedTransaction(
    receiptMeta.transactionHash,
    {
      commitment: "confirmed",
    }
  );
  if (!receipt) {
    throw new Error(
      `Receipt for transaction hash ${receiptMeta.transactionHash} not found.`
    );
  }
  if (receipt.meta === null) {
    throw new Error(
      `Transaction hash ${receiptMeta.transactionHash} does not have metadata.`
    );
  }
  if (receipt.meta.logMessages === null || receipt.meta.logMessages === undefined) {
    throw new Error(
      `Transaction hash ${receiptMeta.transactionHash} does not have log messages.`
    );
  }
  const program = new Program(bridgeIdl, { connection });
  const eventParser = new EventParser(
    program.programId,
    new BorshCoder(program.idl)
  );
  const events = eventParser.parseLogs(receipt.meta.logMessages);
  for (const event of events) {
    if (event.name === "SendEvent") {
      const eventData = event.data;
      if (!eventData) {
        throw new Error(
          `Transaction hash ${receiptMeta.transactionHash} does not have event data.`
        );
      }
      if (
        utils.toHex(eventData.from) !== receiptWithMeta.receipts.from ||
        utils.toHexFromBytes(eventData.to) !== receiptWithMeta.receipts.to ||
        utils.toHex(eventData.token_address_from) !== receiptWithMeta.receipts.tokenAddressFrom ||
        utils.toHexFromBytes(eventData.token_address_to) !== receiptWithMeta.receipts.tokenAddressTo ||
        BigInt(eventData.amount_from) !== receiptWithMeta.receipts.amountFrom ||
        BigInt(utils.toHexFromBytes(eventData.amount_to)) !== receiptWithMeta.receipts.amountTo ||
        BigInt(eventData.chain_from) !== receiptWithMeta.receipts.chainFrom ||
        BigInt(eventData.chain_to) !== receiptWithMeta.receipts.chainTo ||
        BigInt(eventData.event_id) !== receiptWithMeta.receipts.eventId ||
        BigInt(utils.toHexFromBytes(eventData.flags)) !== receiptWithMeta.receipts.flags ||
        utils.toHex(eventData.data) !== receiptWithMeta.receipts.data
      )
        throw new Error(
          `Event data does not match receipt for transaction hash ${receiptMeta.transactionHash}.`
        );
      console.log(`Transaction ${receiptMeta.transactionHash} is valid.`);
      return;
    }
  }
}

export default validateExistingTransactionSolana;
