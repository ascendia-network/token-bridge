import { Context, Event } from "ponder:registry";
import { receipt } from "ponder:schema";

export async function saveReceipt(context: Context, event: Event<"bridge:TokenLocked" | "bridge:TokenUnlocked">): Promise<string> {
  const receiptEntry = {
    blockHash: event.block.hash,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    transactionIndex: event.transaction.transactionIndex,
    bridgeAddress: event.log.address,
    from: event.args.from,
    to: event.args.to,
    tokenAddress: event.args.tokenAddress,
    amount: event.args.amount,
    chainFrom: event.args.chainFrom,
    chainTo: event.args.chainTo,
    eventId: event.args.eventId,
    flags: event.args.flags,
    data: event.args.data,
    claimed: event.name === "TokenUnlocked",
  };

  await context.db.insert(receipt).values(receiptEntry).onConflictDoUpdate({...receiptEntry});
  return `${event.args.chainFrom}-${event.args.chainTo}:${event.args.eventId}`;
}
