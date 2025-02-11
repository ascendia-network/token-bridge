import { type Context, type Event } from "ponder:registry";

import { claimed, receipt, receiptMeta } from "ponder:schema";

export async function saveReceiptSend(
  context: Context,
  event: Event<"bridge:TokenLocked">
): Promise<string> {
  const receiptEntry = {
    timestamp: event.block.timestamp,
    bridgeAddress: event.log.address,
    ...event.args.receipt,
  };

  const entity = await context.db
    .insert(receipt)
    .values(receiptEntry)
    .onConflictDoNothing();

  if (entity) {
    let receiptMetaEntry: any = {
      receiptId: entity?.receiptId,
    };

    receiptMetaEntry = {
      ...receiptMetaEntry,
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
    timestamp: event.block.timestamp,
    bridgeAddress: event.log.address,
    ...event.args.receipt,
  };

  const entity = await context.db
    .insert(claimed)
    .values(receiptEntry)
    .onConflictDoNothing();
  if (entity) {
    let receiptMetaEntry: any = {
      receiptId: entity?.receiptId,
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
