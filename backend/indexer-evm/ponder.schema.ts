import { SQL } from "drizzle-orm";
import { onchainTable, primaryKey, relations, sql } from "ponder";

export const receiptsSent = onchainTable(
  "receiptsSent",
  (t) => ({
    receiptId: t
      .text("receipt_id")
      .notNull(),
    timestamp: t.bigint().notNull(),
    bridgeAddress: t.hex().notNull(),
    // .references(() => bridgeParams.bridgeAddress), // Not supported in ponder
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenAddressFrom: t.hex().notNull(),
    // .references(() => bridgedTokens.tokenAddressHex), // Not supported in ponder
    tokenAddressTo: t.hex().notNull(),
    amountFrom: t.bigint().notNull(),
    amountTo: t.bigint().notNull(),
    chainFrom: t.bigint().notNull(),
    chainTo: t.bigint().notNull(),
    eventId: t.bigint().notNull(),
    flags: t.bigint().notNull(),
    data: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.chainFrom, table.chainTo, table.eventId],
    }),
  })
);

export const receiptsClaimed = onchainTable(
  "receiptsClaimed",
  (t) => ({
    receiptId: t
      .text("receipt_id")
      .notNull(),
    // .references(() => receipt.receiptId), // Not supported in ponder
    timestamp: t.bigint().notNull(),
    bridgeAddress: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenAddressTo: t.hex().notNull(),
    // .references(() => bridgedTokens.tokenAddressHex), // Not supported in ponder
    amountTo: t.bigint().notNull(),
    chainFrom: t.bigint().notNull(),
    chainTo: t.bigint().notNull(),
    eventId: t.bigint().notNull(),
    flags: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.chainFrom, table.chainTo, table.eventId],
    }),
  })
);

export const receiptMeta = onchainTable("receiptsMeta", (t) => ({
  receiptId: t.text("receipt_id").primaryKey(),
  // .references(() => receipt.receiptId), // Not supported in ponder
  eventChain: t.bigint(),
  blockHash: t.hex(),
  blockNumber: t.bigint(),
  timestamp: t.bigint(),
  transactionHash: t.hex(),
  transactionIndex: t.integer(),
}));

export const bridgeParams = onchainTable("bridges", (t) => ({
  bridgeAddress: t.hex().primaryKey(),
  feeReceiver: t.hex().notNull(),
  nativeSendAmount: t.bigint().notNull(),
  validatorAddress: t.hex().notNull(),
}));

// TODO: IDK how to deal with duplicate token addresses on different chains
export const bridgedTokens = onchainTable("bridged_tokens", (t) => ({
  tokenAddressHex: t.hex().primaryKey(),
  tokenAddress: t.text(),
  isBridged: t.boolean().notNull().default(false),
  isPaused: t.boolean().notNull().default(true),
}));

export const bridgeRelations = relations(bridgeParams, ({ many }) => ({
  receipts: many(receiptsSent),
  tokens: many(bridgeToToken),
}));

export const bridgeToToken = onchainTable(
  "bridge_to_token",
  (t) => ({
    bridgeAddress: t.hex().notNull(),
    // .references(() => bridgeParams.bridgeAddress), // Not supported in ponder
    tokenAddress: t.hex().notNull(),
    // .references(() => bridgedTokens.tokenAddress), // Not supported in ponder
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.bridgeAddress, table.tokenAddress] }),
  })
);

export const receiptRelations = relations(receiptsSent, ({ one }) => ({
  bridge: one(bridgeParams, {
    fields: [receiptsSent.bridgeAddress],
    references: [bridgeParams.bridgeAddress],
  }),
  token: one(bridgedTokens, {
    fields: [receiptsSent.tokenAddressFrom],
    references: [bridgedTokens.tokenAddressHex],
  }),
  meta: one(receiptMeta, {
    fields: [receiptsSent.receiptId],
    references: [receiptMeta.receiptId],
  }),
}));

export const claimedRelations = relations(receiptsClaimed, ({ one }) => ({
  token: one(bridgedTokens, {
    fields: [receiptsClaimed.tokenAddressTo],
    references: [bridgedTokens.tokenAddressHex],
  }),
}));

export const receiptMetaRelations = relations(receiptMeta, ({ one }) => ({
  receipt: one(receiptsSent, {
    fields: [receiptMeta.receiptId],
    references: [receiptsSent.receiptId],
  }),
  claimed: one(receiptsClaimed, {
    fields: [receiptMeta.receiptId],
    references: [receiptsClaimed.receiptId],
  }),
}));

export const bridgeToTokenRelations = relations(bridgeToToken, ({ one }) => ({
  bridge: one(bridgeParams, {
    fields: [bridgeToToken.bridgeAddress],
    references: [bridgeParams.bridgeAddress],
  }),
  token: one(bridgedTokens, {
    fields: [bridgeToToken.tokenAddress],
    references: [bridgedTokens.tokenAddress],
  }),
}));

export const tokenRelations = relations(bridgedTokens, ({ one, many }) => ({
  bridges: many(bridgeToToken),
  receipts: many(receiptsSent),
}));
