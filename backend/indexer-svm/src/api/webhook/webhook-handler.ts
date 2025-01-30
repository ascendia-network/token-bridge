import { SolanaTransaction } from "./types";
import { saveTransaction } from "../../db/db";

const programId = "F6jLbP9BudXireGvYQyEeLs483BHMpv2nQug5XJJRkFm";


export async function webhookHandler (request, reply) {
  console.log("request")
  const events = request.body as SolanaTransaction[];
  console.log('events', JSON.stringify(events, undefined, 2));
  for (const event of events) {
    const {userFrom, userTo, token, amount, feeAmount, additionalData, nonce} = parseLogs(event.meta.logMessages, programId)
    saveTransaction(
      event.transaction.signatures[0],
      userFrom,
      userTo,
      token,
      amount,
      feeAmount,
      additionalData,
      nonce,
      event.slot,
      event.blockTime
    )
  }

  return 'pong'
}


function parseLogs(logMessages: string[], programId: string) {
  const firstProgramLog = logMessages.findIndex((log) => log.includes(`Program ${programId} invoke`))
  const payloadLog = logMessages[firstProgramLog + 2]
  const prefix = "Program log: "
  const parsedPayload = payloadLog.slice(prefix.length)
  return {userFrom: "test", userTo: "test", token: "test", amount: "10", feeAmount: "1", additionalData: "test", nonce: "1"};
}
