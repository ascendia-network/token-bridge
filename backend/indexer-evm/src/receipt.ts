import { type Context, type Event } from "ponder:registry";
import { receipt, receiptMeta } from "ponder:schema";

export async function saveReceipt(
  context: Context,
  event: Event<"bridge:TokenLocked" | "bridge:TokenUnlocked">
): Promise<string> {
  const receiptEntry = {
    timestamp: event.block.timestamp,
    bridgeAddress: event.log.address,
    from: event.args.receipt.from,
    to: event.args.receipt.to,
    tokenAddress: event.args.receipt.tokenAddress,
    amount: event.args.receipt.amount,
    chainFrom: event.args.receipt.chainFrom,
    chainTo: event.args.receipt.chainTo,
    eventId: event.args.receipt.eventId,
    flags: event.args.receipt.flags,
    data: event.args.receipt.data,
    claimed: event.name === "TokenUnlocked",
  };

  await context.db
    .insert(receipt)
    .values(receiptEntry)
    .onConflictDoUpdate({ claimed: receiptEntry.claimed });

  let receiptMetaEntry: any = {
    receiptId: `${event.args.receipt.chainFrom}-${event.args.receipt.chainTo}-${event.args.receipt.eventId}`,
  };

  if (event.name === "TokenLocked") {
    receiptMetaEntry = {
      ...receiptMetaEntry,
      sendBlockHash: event.block.hash,
      sendBlockNumber: event.block.number,
      sendTimestamp: event.block.timestamp,
      sendTransactionHash: event.transaction.hash,
      sendTransactionIndex: event.transaction.transactionIndex,
    };
  } else {
    receiptMetaEntry = {
      ...receiptMetaEntry,
      receiveBlockHash: event.block.hash,
      receiveBlockNumber: event.block.number,
      receiveTimestamp: event.block.timestamp,
      receiveTransactionHash: event.transaction.hash,
      receiveTransactionIndex: event.transaction.transactionIndex,
    };
  }

  await context.db
    .insert(receiptMeta)
    .values(receiptMetaEntry)
    .onConflictDoUpdate(receiptMetaEntry);

  return `${event.args.receipt.chainFrom}:${event.args.receipt.chainTo}:${event.args.receipt.eventId}`;
}
