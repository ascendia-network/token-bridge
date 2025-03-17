import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder, EventParser, Program, Idl } from "@coral-xyz/anchor";
import idl from "../../idl/idl";
import { receiptsClaimed, receiptsMeta, receiptsSent } from "../../db/schema";
import { SolanaTransaction } from "./types";
import db from "../../db/db";
import {
  safeBigIntFromBuffer, safeBigIntFromHex,
  safeHexToNumber,
  safeHexToString,
  safeNumberToString,
  toHex,
  toHexFromBytes
} from "./utils";
import { eq } from "drizzle-orm";

const CHAIN_NAME_TO_CHAIN_ID = {
  "devnet": "6003100671677645902",
  "mainnet-beta": "6003100671677628416"
};

type Cluster = "devnet" | "testnet" | "mainnet-beta"

const connection = new Connection(clusterApiUrl(process.env.SOL_ENVIRONMENT as Cluster), "confirmed");
export const program = new Program(idl, { connection });

export async function webhookHandler(request, reply) {
  try {
    const events = request.body as SolanaTransaction[];
    const eventParser = new EventParser(new PublicKey(idl.address), new BorshCoder(idl as Idl));

    if (!Array.isArray(events)) return "pong";

    for (const event of events) {
      const logs = eventParser.parseLogs(event.meta.logMessages);

      for (const log of logs) {
        let insertValues: any = null;
        let model: any = null;

        switch (log.name) {
          case "SendEvent":
            ({ model, values: insertValues } = processSendEvent(log, event));
            break;
          case "ReceivePayload":
            ({ model, values: insertValues } = await processReceiveEvent(log, event));
            break;
          default:
            continue;
        }

        if (insertValues && model) {
          insertValues.receiptId = `${insertValues.chainFrom}_${insertValues.chainTo}_${insertValues.eventId}`;
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
      amountFrom: safeNumberToString(log.data.amount_from), // TODO: should be numeric?
      amountTo: safeBigIntFromBuffer(log.data.amount_to),
      chainFrom: safeBigIntFromHex(log.data.chain_from),
      chainTo: safeBigIntFromHex(log.data.chain_to),
      eventId: safeBigIntFromHex(log.data.event_id),
      flags: safeHexToNumber(log.data.flags),
      data: safeHexToString(log.data.flag_data)
    }
  };
}

/**
 * Extracts and formats data from a Solana receive event log for claimed receipt processing.
 *
 * This asynchronous function converts raw log data from a Solana transaction event into a structured object. It parses hexadecimal values such as token addresses, amounts, chain identifiers, event ID, and flags into appropriate formats, preparing the data for insertion into the database under the claimed receipts model.
 *
 * @param log - The log entry containing raw event data including recipient addresses, amounts, chain identifiers, and flag details.
 * @param event - The Solana transaction event providing metadata such as the block time.
 * @returns An object with the receipts claimed model and a values object populated with the formatted and converted event data.
 */
async function processReceiveEvent(log: any, event: SolanaTransaction) {
  const toAddress = new PublicKey(log.data.to);
  const tokenAddressTo = new PublicKey(log.data.token_address_to);

  return {
    model: receiptsClaimed,
    values: {
      timestamp: event.blockTime,
      bridgeAddress: program.programId.toBase58(),
      to: toHexFromBytes(toAddress.toBytes()),
      tokenAddressTo: toHexFromBytes(tokenAddressTo.toBytes()),
      amountTo: safeBigIntFromHex(log.data.amount_to),
      chainTo: safeBigIntFromHex(log.data.chain_to),
      chainFrom: safeBigIntFromHex(log.data.chain_from),
      eventId: safeBigIntFromHex(log.data.event_id),
      flags: safeHexToNumber(log.data.flags),
      data: safeHexToString(log.data.flag_data)
    }
  };
}
