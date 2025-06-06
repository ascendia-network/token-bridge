import {
  count,
  desc,
  eq,
  exists,
  getTableColumns,
  SQL,
  sql,
} from "drizzle-orm";
import { pgSchema } from "drizzle-orm/pg-core";
import * as evmSchema from "./evm.schema";
import * as solanaSchema from "./solana.schema";

export const coreSchema = pgSchema("bridge");

export const signatures = coreSchema.table("signatures", (t) => ({
  id: t.serial("id").primaryKey(),
  receiptId: t.text("receipt_id").notNull(),
  signedBy: t.text("signed_by").notNull(),
  signature: t.text().notNull(),
}));

export const receipt = coreSchema.materializedView("receipts").as((qb) => {
  const evmReceipts = qb
    .select({
      ...getTableColumns(evmSchema.receiptsSentInIndexerEvm),
      claimed: exists(
        qb
          .select({
            cl: sql`1`,
          })
          .from(solanaSchema.receiptsClaimedInIndexerSolana)
          .where(
            eq(
              evmSchema.receiptsSentInIndexerEvm.receiptId,
              solanaSchema.receiptsClaimedInIndexerSolana.receiptId
            )
          )
      ).as("claimed") as SQL.Aliased<boolean>,
    })
    .from(evmSchema.receiptsSentInIndexerEvm)
    .orderBy(evmSchema.receiptsSentInIndexerEvm.timestamp);
  const solanaReceipts = qb
    .select({
      ...getTableColumns(solanaSchema.receiptsSentInIndexerSolana),
      claimed: exists(
        qb
          .select({
            claimed: sql`1`,
          })
          .from(evmSchema.receiptsClaimedInIndexerEvm)
          .where(
            eq(
              solanaSchema.receiptsSentInIndexerSolana.receiptId,
              evmSchema.receiptsClaimedInIndexerEvm.receiptId
            )
          )
      ).as("claimed") as SQL.Aliased<boolean>,
    })
    .from(solanaSchema.receiptsSentInIndexerSolana)
    .orderBy(solanaSchema.receiptsSentInIndexerSolana.timestamp);
  const unioned = evmReceipts.unionAll(solanaReceipts).as("unioned");
  const sig_agg = qb
    .select({
      receiptId: signatures.receiptId,
      signaturesCount: count().as("signatures_count"),
    })
    .from(signatures)
    .groupBy(signatures.receiptId)
    .as("signatures_agg");
  return qb
    .select({
      ...unioned._.selectedFields,
      signaturesCount: sql`COALESCE(${sig_agg.signaturesCount}, 0)`.as(
        "signatures_count"
      ),
    })
    .from(unioned)
    .leftJoin(sig_agg, eq(unioned.receiptId, sig_agg.receiptId))
    .orderBy(unioned.timestamp, desc(unioned.claimed));
});

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
