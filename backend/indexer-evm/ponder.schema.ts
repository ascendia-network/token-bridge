import { onchainTable, primaryKey, relations } from "ponder";

export const receipt = onchainTable(
  "receipt",
  (t) => ({
    blockHash: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    transactionIndex: t.integer().notNull(),
    bridgeAddress: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
    amount: t.bigint().notNull(),
    chainFrom: t.hex().notNull(),
    chainTo: t.hex().notNull(),
    eventId: t.bigint().notNull(),
    flags: t.bigint().notNull(),
    data: t.hex().notNull(),
    claimed: t.boolean().notNull().default(false),
    signature: t.hex(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.chainFrom, table.chainTo, table.eventId],
    }),
  })
);

export const receiptRelations = relations(receipt, ({ one }) => ({
  bridge: one(bridgeParams, {
    fields: [receipt.bridgeAddress],
    references: [bridgeParams.bridgeAddress],
  }),
  token: one(bridgedTokens, {
    fields: [receipt.tokenAddress],
    references: [bridgedTokens.tokenAddress],
  }),
}));

export const bridgeParams = onchainTable("bridgeParams", (t) => ({
  bridgeAddress: t.hex().primaryKey(),
  feeReceiver: t.hex().notNull(),
  nativeSendAmount: t.bigint().notNull(),
  validatorAddress: t.hex().notNull(),
}));

export const bridgeRelations = relations(bridgeParams, ({ many }) => ({
  receipts: many(receipt),
  tokens: many(bridgeToToken),
}));

export const bridgeToToken = onchainTable(
  "bridgeToToken",
  (t) => ({
    bridgeAddress: t.hex().notNull(),
    tokenAddress: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.bridgeAddress, table.tokenAddress] }),
  })
);

export const bridgeToTokenRelations = relations(bridgeToToken, ({ one }) => ({
  user: one(bridgeParams, { fields: [bridgeToToken.bridgeAddress], references: [bridgeParams.bridgeAddress] }),
  team: one(bridgedTokens, { fields: [bridgeToToken.tokenAddress], references: [bridgedTokens.tokenAddress] }),
}));

// TODO: IDK how to deal with duplicate token addresses on different chains
export const bridgedTokens = onchainTable("bridgedTokens", (t) => ({
  tokenAddress: t.hex().primaryKey(),
  isBridged: t.boolean().notNull().default(false),
  isPaused: t.boolean().notNull().default(true),
}));

export const tokenRelations = relations(bridgedTokens, ({ one, many }) => ({
  bridges: many(bridgeToToken),
  receipts: many(receipt),
}));