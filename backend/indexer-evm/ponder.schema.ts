import { onchainTable, relations } from "ponder";



export const bridgeEvent = onchainTable("bridgeEvent", (t) => ({
  id: t.text().primaryKey(),

  networkFrom: t.text().notNull(),
  networkTo: t.text().notNull(),

  eventName: t.text().notNull(),
  eventId: t.integer(),

  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),

  jsonLog: t.text().notNull(),

  blockNumber: t.integer().notNull(),
  gasUsed: t.bigint().notNull(),
  gasPrice: t.bigint().notNull(),
  methodId: t.text().notNull(),
  timestamp: t.integer().notNull(),


  // fields below only for withdraw
  tokenFrom: t.text(),
  tokenTo: t.text(),

  userFrom: t.text(),
  userTo: t.text(),

  amount: t.bigint(),

  feeTransfer: t.bigint(),
  feeBridge: t.bigint(),

}));



