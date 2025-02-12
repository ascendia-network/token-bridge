import { bytesToBigInt, stringToBytes } from "viem";
import db from "../../db/db";
import { receiptsClaimed, receiptsMeta, receiptsSent } from "../../db/schema";
import { SolanaTransaction } from "./types";

const programId = "F6jLbP9BudXireGvYQyEeLs483BHMpv2nQug5XJJRkFm";


export async function webhookHandler (request, reply) {
  console.log("request")
  const events = request.body as SolanaTransaction[];
  console.log('events', JSON.stringify(events, undefined, 2));
  for (const event of events) {
    const { userFrom, userTo, token, amount, feeAmount, additionalData, nonce } = parseLogs(event.meta.logMessages, programId);
    let model, insertValues;
    const isClaimTx = event.meta.logMessages.some((log) => log.includes("Claim"));
    if (isClaimTx) {
      model = receiptsClaimed;
      insertValues = {
        timestamp: event.blockTime,
        bridgeAddress: "", //???
        from: userFrom,
        to: userTo,
        tokenAddressFrom: token, //???
        tokenAddressTo: token, //???
        amountFrom: amount, //???
        amountTo: amount, //???
        chainFrom: bytesToBigInt(stringToBytes("SOLANA", { size: 32 })),
        chainTo: 1234, //???
        eventId: 1234, //???
        flags: 1234, //???
        data: additionalData,
      };
    } else {
      model = receiptsSent;
      insertValues = {
        timestamp: event.blockTime,
        bridgeAddress: "", //???
        to: userTo,
        tokenAddressTo: token, //???
        amountTo: amount, //???
        chainFrom: 1234, //???
        chainTo: bytesToBigInt(stringToBytes("SOLANA", { size: 32 })),
        eventId: 1234, //???
        flags: 1234, //???
      };
    }
    const entity = await db.insert(model).values({ ...insertValues }).onConflictDoNothing().returning({ receiptId: model.receiptId });
    const metadata = {
      receiptId: entity[0].receiptId,
      blockHash: event.slot, //???
      blockNumber: event.slot, //???
      timestamp: event.blockTime,
      transactionHash: event.transaction.signatures[0], //???
      transactionIndex: event.indexWithinBlock,
    };
    await db.insert(receiptsMeta).values({ ...metadata }).onConflictDoNothing();
  }

  return 'pong'
}


function parseLogs(logMessages: string[], programId: string) {
  const firstProgramLog = logMessages.findIndex((log) => log.includes(`Program ${programId} invoke`))
  const payloadLog = logMessages[firstProgramLog + 2]
  const prefix = "Program log: "
  const parsedPayload = payloadLog.slice(prefix.length)
  console.log('parsedPayload', parsedPayload)
  return {userFrom: "test", userTo: "test", token: "test", amount: "10", feeAmount: "1", additionalData: "test", nonce: "1"};
}
