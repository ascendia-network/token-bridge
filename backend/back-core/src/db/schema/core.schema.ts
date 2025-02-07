import { desc } from "drizzle-orm";
import { pgSchema } from "drizzle-orm/pg-core";
import * as evmSchema from "./evm.schema";
import * as svmSchema from "./solana.schema";

export const coreSchema = pgSchema("bridge");

export const receipt = coreSchema.materializedView("receipts").as((qb) => {
  const evmReceipts = qb
    .select()
    .from(evmSchema.receiptsInIndexerEvm)
    .orderBy(
      desc(evmSchema.receiptsInIndexerEvm.claimed),
      evmSchema.receiptsInIndexerEvm.timestamp
    );
  const svmReceipts = qb
    .select()
    .from(svmSchema.receiptsInIndexerSolana)
    .orderBy(
      desc(svmSchema.receiptsInIndexerSolana.claimed),
      svmSchema.receiptsInIndexerSolana.timestamp
    );
  const unioned = evmReceipts.union(svmReceipts).as("unioned");
  return qb
    .selectDistinctOn([unioned.receiptId])
    .from(unioned)
    .orderBy(unioned.receiptId, unioned.timestamp, desc(unioned.claimed));
});

export const signatures = coreSchema.table("signatures", (t) => ({
  id: t.serial("id").primaryKey(),
  receiptId: t.text("receipt_id").notNull(),
  signedBy: t.text("signed_by").notNull(),
  signature: t.text().notNull(),
}));

// export const signaturesToReceipt = coreSchema.table(
//   "signatures_to_receipt",
//   (t) => ({
//     signatureId: t.numeric("signature_id").references(() => signatures.id),
//     receiptId: t.text("receipt_id").references(() => receipt.receiptId),
//   }),
//   (table) => [
//     primaryKey({
//       columns: [table.signatureId, table.receiptId],
//     }),
//   ]
// );

// export const signatureRelations = relations(signatures, ({ many }) => ({
//   receipts: many(signaturesToReceipt),
// }));

// export const signaturesToReceiptRelations = relations(
//   signaturesToReceipt,
//   ({ one }) => ({
//     signature: one(signatures, {
//       fields: [signaturesToReceipt.signatureId],
//       references: [signatures.id],
//     }),
//   })
// );
