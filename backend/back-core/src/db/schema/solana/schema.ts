import { pgTable, pgSchema, primaryKey, text, numeric, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const indexerSolana = pgSchema("indexer_solana");


export const receiptsInIndexerSolana = indexerSolana.table("receipts", {
	receiptId: text("receipt_id").notNull(),
	timestamp: numeric({ precision: 78, scale:  0 }).notNull(),
	bridgeAddress: text("bridge_address").notNull(),
	from: text().notNull(),
	to: text().notNull(),
	tokenAddress: text("token_address").notNull(),
	amount: numeric({ precision: 78, scale:  0 }).notNull(),
	chainFrom: numeric("chain_from", { precision: 78, scale:  0 }).notNull(),
	chainTo: numeric("chain_to", { precision: 78, scale:  0 }).notNull(),
	eventId: numeric("event_id", { precision: 78, scale:  0 }).notNull(),
	flags: numeric({ precision: 78, scale:  0 }).notNull(),
	data: text().notNull(),
	claimed: boolean().default(false).notNull(),
}, (table) => [
	primaryKey({ columns: [table.chainFrom, table.chainTo, table.eventId], name: "receipts_chain_from_chain_to_event_id_pk"}),
]);
