import { bytesToBigInt, stringToBytes } from "viem";
import db from "../../db/db";
import { receiptsClaimed, receiptsMeta, receiptsSent } from "../../db/schema";
import { SolanaTransaction } from "./types";

const programId = "F6jLbP9BudXireGvYQyEeLs483BHMpv2nQug5XJJRkFm";

export async function webhookHandler(request, reply) {
  console.log("request");
  const events = request.body as SolanaTransaction[];
  console.log("events", JSON.stringify(events, undefined, 2));
  for (const event of events) {
    const {
      userFrom,
      userTo,
      tokenFrom,
      tokenTo,
      amountFrom,
      amountTo,
      chainFrom,
      chainTo,
      eventId,
      flags,
      additionalData,
    } = parseLogs(event.meta.logMessages, programId);
    let model, insertValues;
    const isClaimTx = event.meta.logMessages.some((log) =>
      log.includes("Claim")
    );
    if (isClaimTx) {
      model = receiptsClaimed;
      insertValues = {
        timestamp: event.blockTime,
        bridgeAddress: programId,
        from: userFrom,
        to: userTo,
        tokenAddressFrom: tokenFrom,
        tokenAddressTo: tokenTo,
        amountFrom: amountFrom,
        amountTo: amountTo,
        chainFrom: bytesToBigInt(stringToBytes("SOLANA", { size: 32 })),
        chainTo: chainTo,
        eventId: eventId,
        flags: flags,
        data: additionalData,
      };
    } else {
      model = receiptsSent;
      insertValues = {
        timestamp: event.blockTime,
        bridgeAddress: programId, //???
        to: userTo,
        tokenAddressTo: tokenTo, //???
        amountTo: amountTo, //???
        chainFrom: chainFrom, //???
        chainTo: bytesToBigInt(stringToBytes("SOLANA", { size: 32 })),
        eventId: eventId, //???
        flags: flags, //???
      };
    }
    const entity = await db
      .insert(model)
      .values({ ...insertValues })
      .onConflictDoNothing()
      .returning({ receiptId: model.receiptId });
    const metadata = {
      receiptId: entity[0].receiptId,
      //blockHash: event.slot, //Not applicable for Solana
      blockNumber: event.slot, //???
      timestamp: event.blockTime,
      transactionHash: event.transaction.signatures[0], // is this correct and always the first signature?
      transactionIndex: event.indexWithinBlock,
    };
    await db
      .insert(receiptsMeta)
      .values({ ...metadata })
      .onConflictDoNothing();
  }
  return "pong";
}

function parseLogs(logMessages: string[], programId: string) {
  const firstProgramLog = logMessages.findIndex((log) =>
    log.includes(`Program ${programId} invoke`)
  );
  const payloadLog = logMessages[firstProgramLog + 2];
  const prefix = "Program log: ";
  const parsedPayload = payloadLog.slice(prefix.length);
  console.log("parsedPayload", parsedPayload);
  return {
    userFrom: "test",
    userTo: "test",
    tokenFrom: "test",
    tokenTo: "test",
    amountFrom: "10",
    amountTo: "10",
    chainFrom: 1,
    chainTo: 1,
    eventId: 1,
    flags: 1,
    additionalData: "test",
  };
}
