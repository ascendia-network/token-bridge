import { onchainTable, primaryKey, relations } from "ponder";

export const receipt = onchainTable(
  "receipts",
  (t) => ({
    receiptId: t
      .text("receipt_id")
      .notNull()
      .$defaultFn(
        (): string =>
          `${receipt.chainFrom}_${receipt.chainTo}_${receipt.eventId}`
      )
      .$onUpdateFn(
        (): string =>
          `${receipt.chainFrom}_${receipt.chainTo}_${receipt.eventId}`
      ),
    timestamp: t.bigint().notNull(),
    bridgeAddress: t
      .hex()
      .notNull(),
      // .references(() => bridgeParams.bridgeAddress), // Not supported in ponder
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenAddress: t
      .hex()
      .notNull(),
      // .references(() => bridgedTokens.tokenAddressHex), // Not supported in ponder
    amount: t.bigint().notNull(),
    chainFrom: t.bigint().notNull(),
    chainTo: t.bigint().notNull(),
    eventId: t.bigint().notNull(),
    flags: t.bigint().notNull(),
    data: t.hex().notNull(),
    claimed: t.boolean().notNull().default(false),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.chainFrom, table.chainTo, table.eventId],
    }),
  })
);

export const receiptMeta = onchainTable("receiptsMeta", (t) => ({
  receiptId: t
    .text("receipt_id")
    .primaryKey(),
    // .references(() => receipt.receiptId), // Not supported in ponder
  sendBlockHash: t.hex(),
  sendBlockNumber: t.bigint(),
  sendTimestamp: t.bigint(),
  sendTransactionHash: t.hex(),
  sendTransactionIndex: t.integer(),
  receiveBlockHash: t.hex(),
  receiveBlockNumber: t.bigint(),
  receiveTimestamp: t.bigint(),
  receiveTransactionHash: t.hex(),
  receiveTransactionIndex: t.integer(),
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
  receipts: many(receipt),
  tokens: many(bridgeToToken),
}));

export const bridgeToToken = onchainTable(
  "bridge_to_token",
  (t) => ({
    bridgeAddress: t
      .hex()
      .notNull(),
      // .references(() => bridgeParams.bridgeAddress), // Not supported in ponder
    tokenAddress: t
      .hex()
      .notNull(),
      // .references(() => bridgedTokens.tokenAddress), // Not supported in ponder
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.bridgeAddress, table.tokenAddress] }),
  })
);

export const receiptRelations = relations(receipt, ({ one }) => ({
  bridge: one(bridgeParams, {
    fields: [receipt.bridgeAddress],
    references: [bridgeParams.bridgeAddress],
  }),
  token: one(bridgedTokens, {
    fields: [receipt.tokenAddress],
    references: [bridgedTokens.tokenAddressHex],
  }),
  meta: one(receiptMeta, {
    fields: [receipt.receiptId],
    references: [receiptMeta.receiptId],
  }),
}));

export const receiptMetaRelations = relations(receiptMeta, ({ one }) => ({
  receipt: one(receipt, {
    fields: [receiptMeta.receiptId],
    references: [receipt.receiptId],
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
  receipts: many(receipt),
}));
