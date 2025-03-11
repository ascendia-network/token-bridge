import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder, EventParser, Program, Idl } from "@coral-xyz/anchor";
import idl from "../../idl/idl";
import { receiptsClaimed, receiptsMeta, receiptsSent } from "../../db/schema";
import { SolanaTransaction } from "./types";
import db from "../../db/db";
import { safeBigInt, safeHexToNumber, safeHexToString, safeNumber, toHex, toHexFromBytes } from "./utils";

const CHAIN_NAME_TO_CHAIN_ID = {
  "devnet": "6003100671677645902",
  "mainnet-beta": "6003100671677628416"
};

type Cluster = "devnet" | "testnet" | "mainnet-beta"

const connection = new Connection(clusterApiUrl(process.env.SOL_ENVIRONMENT as Cluster), "confirmed");
const solanaChainId = CHAIN_NAME_TO_CHAIN_ID[process.env.SOL_ENVIRONMENT || "devnet"];
export const program = new Program(idl, { connection });

export async function webhookHandler(request, reply) {
  try {
    const events = request.body as SolanaTransaction[];
    const eventParser = new EventParser(new PublicKey(idl.address), new BorshCoder(idl as Idl));

    for (const event of events) {
      const logs = eventParser.parseLogs(event.meta.logMessages);

      for (const log of logs) {
        let insertValues: any = null;
        let model: any = null;

        if (log.name === "SendEvent") {
          ({ model, values: insertValues } = processSendEvent(log, event));
          insertValues.receiptId = `${insertValues.chainFrom}_${insertValues.chainTo}_${insertValues.eventId}`;
        } else if (log.name === "ReceivePayload") {
          ({ model, values: insertValues } = processReceiveEvent(log, event));
          insertValues.receiptId = `${solanaChainId}_${insertValues.chainTo}_${insertValues.eventId}`;
        } else {
          continue;
        }

        if (insertValues && model) {
          const entity = await db
            .insert(model)
            .values(insertValues)
            .onConflictDoNothing()
            .returning({ receiptId: model.receiptId });

          const metadata = {
            receiptId: entity[0].receiptId,
            //blockHash: event.slot, //Not applicable for Solana
            blockNumber: event.slot, //???
            timestamp: event.blockTime,
            transactionHash: event.transaction.signatures[0], // is this correct and always the first signature?
            transactionIndex: event.indexWithinBlock
          };
          await db
            .insert(receiptsMeta)
            .values({ ...metadata })
            .onConflictDoNothing();
        }

      }
    }
  } catch (err) {
    console.error("Error processing event:", err.name, err);
    return "pong";
  }
  return "pong";
}

function processSendEvent(log: any, event: SolanaTransaction) {
  return {
    model: receiptsSent,
    values: {
      timestamp: event.blockTime,
      bridgeAddress: program.programId.toBase58(),
      from: toHex(log.data.from.toBase58()),
      to: toHexFromBytes(log.data.to),
      tokenAddressFrom: toHex(log.data.token_address_from.toBase58()),
      tokenAddressTo: toHexFromBytes(log.data.token_address_to),
      amountFrom: safeNumber(log.data.amount_from),
      amountTo: safeBigInt(log.data.amount_to),
      chainFrom: safeNumber(log.data.chain_from),
      chainTo: safeNumber(log.data.chain_to),
      eventId: safeNumber(log.data.event_id),
      flags: safeHexToNumber(log.data.flags),
      data: safeHexToString(log.data.flag_data)
    }
  };
}

function processReceiveEvent(log: any, event: SolanaTransaction) {
  const toAddress = new PublicKey(log.data.to);
  const tokenAddressTo = new PublicKey(log.data.token_address_to);
  return {
    model: receiptsClaimed,
    values: {
      timestamp: event.blockTime,
      bridgeAddress: program.programId.toBase58(),
      to: toHexFromBytes(toAddress.toBytes()),
      tokenAddressTo: toHexFromBytes(tokenAddressTo.toBytes()),
      amountTo: safeBigInt(log.data.amount_to),
      chainTo: safeNumber(log.data.chain_to),
      eventId: safeNumber(log.data.event_id),
      flags: safeHexToNumber(log.data.flags),
      data: safeHexToString(log.data.flag_data)
    }
  };
}
