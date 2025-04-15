import { type Context, type Event } from "ponder:registry";

import { receiptsClaimed, receiptsSent, receiptMeta } from "ponder:schema";

export async function saveReceiptSend(
  context: Context,
  event: Event<"bridge:TokenLocked">
): Promise<string> {
  const receiptEntry = {
    receiptId:
      event.args.receipt.chainFrom +
      "_" +
      event.args.receipt.chainTo +
      "_" +
      event.args.receipt.eventId,
    timestamp: event.block.timestamp,
    bridgeAddress: event.log.address,
    ...event.args.receipt,
  };

  const entity = await context.db
    .insert(receiptsSent)
    .values(receiptEntry)
    .onConflictDoNothing();

  if (entity) {
    const receiptMetaEntry = {
      receiptId: entity?.receiptId,
      eventChain: context.network.chainId,
      blockHash: event.block.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      transactionIndex: event.transaction.transactionIndex,
    };

    await context.db
      .insert(receiptMeta)
      .values(receiptMetaEntry)
      .onConflictDoNothing();
  }

  return entity?.receiptId ?? "";
}

export async function saveReceiptWithdraw(
  context: Context,
  event: Event<"bridge:TokenUnlocked">
) {
  const receiptEntry = {
    receiptId:
      event.args.receipt.chainFrom +
      "_" +
      event.args.receipt.chainTo +
      "_" +
      event.args.receipt.eventId,
    timestamp: event.block.timestamp,
    bridgeAddress: event.log.address,
    ...event.args.receipt,
  };

  const entity = await context.db
    .insert(receiptsClaimed)
    .values(receiptEntry)
    .onConflictDoNothing();
  if (entity) {
    let receiptMetaEntry: any = {
      receiptId: entity?.receiptId,
      eventChain: context.network.chainId,
      blockHash: event.block.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      transactionIndex: event.transaction.transactionIndex,
    };

    await context.db
      .insert(receiptMeta)
      .values(receiptMetaEntry)
      .onConflictDoNothing();
  }

  return entity?.receiptId ?? "";
}
