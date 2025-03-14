// Exporting all generated types from the schema and relations files
export * from "./evm/schema";
export * from "./evm/relations";
// Extending the relations with custom relations which are not generated
import { relations } from "drizzle-orm";
import * as evmSchema from "./evm/schema";

export const receiptRelations = relations(
  evmSchema.receiptsSentInIndexerEvm,
  ({ one }) => ({
    bridge: one(evmSchema.bridgesInIndexerEvm, {
      fields: [evmSchema.receiptsSentInIndexerEvm.bridgeAddress],
      references: [evmSchema.bridgesInIndexerEvm.bridgeAddress],
    }),
    token: one(evmSchema.bridgedTokensInIndexerEvm, {
      fields: [evmSchema.receiptsSentInIndexerEvm.tokenAddressFrom],
      references: [evmSchema.bridgedTokensInIndexerEvm.tokenAddressHex],
    }),
    meta: one(evmSchema.receiptsMetaInIndexerEvm, {
      fields: [evmSchema.receiptsSentInIndexerEvm.receiptId],
      references: [evmSchema.receiptsMetaInIndexerEvm.receiptId],
    }),
  })
);

export const receiptMetaRelations = relations(evmSchema.receiptsMetaInIndexerEvm, ({ one }) => ({
  receipt: one(evmSchema.receiptsSentInIndexerEvm, {
    fields: [evmSchema.receiptsMetaInIndexerEvm.receiptId],
    references: [evmSchema.receiptsSentInIndexerEvm.receiptId],
  }),
}));

export const bridgeRelations = relations(evmSchema.bridgesInIndexerEvm, ({ many }) => ({
  receipts: many(evmSchema.receiptsSentInIndexerEvm),
  tokens: many(evmSchema.bridgeToTokenInIndexerEvm),
}));

export const bridgeToTokenRelations = relations(evmSchema.bridgeToTokenInIndexerEvm, ({ one }) => ({
  bridge: one(evmSchema.bridgesInIndexerEvm, {
    fields: [evmSchema.bridgeToTokenInIndexerEvm.bridgeAddress],
    references: [evmSchema.bridgesInIndexerEvm.bridgeAddress],
  }),
  token: one(evmSchema.bridgedTokensInIndexerEvm, {
    fields: [evmSchema.bridgeToTokenInIndexerEvm.tokenAddress],
    references: [evmSchema.bridgedTokensInIndexerEvm.tokenAddress],
  }),
}));

export const tokenRelations = relations(evmSchema.bridgedTokensInIndexerEvm, ({ many }) => ({
  bridges: many(evmSchema.bridgeToTokenInIndexerEvm),
  receipts: many(evmSchema.receiptsSentInIndexerEvm),
}));
