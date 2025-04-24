import { pgTable, pgSchema, text, numeric, integer, boolean, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const indexerEvm = pgSchema("indexer_evm");

export const reorgReceiptsSentOperationIdSeqInIndexerEvm = indexerEvm.sequence("_reorg__receiptsSent_operation_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const reorgReceiptsClaimedOperationIdSeqInIndexerEvm = indexerEvm.sequence("_reorg__receiptsClaimed_operation_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const reorgReceiptsMetaOperationIdSeqInIndexerEvm = indexerEvm.sequence("_reorg__receiptsMeta_operation_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const reorgBridgesOperationIdSeqInIndexerEvm = indexerEvm.sequence("_reorg__bridges_operation_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const reorgBridgedTokensOperationIdSeqInIndexerEvm = indexerEvm.sequence("_reorg__bridged_tokens_operation_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const reorgBridgeToTokenOperationIdSeqInIndexerEvm = indexerEvm.sequence("_reorg__bridge_to_token_operation_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })

export const receiptsMetaInIndexerEvm = indexerEvm.table("receiptsMeta", {
	receiptId: text("receipt_id").primaryKey().notNull(),
	eventChain: numeric("event_chain", { precision: 78, scale:  0 }),
	blockHash: text("block_hash"),
	blockNumber: numeric("block_number", { precision: 78, scale:  0 }),
	timestamp: numeric({ precision: 78, scale:  0 }),
	transactionHash: text("transaction_hash"),
	transactionIndex: integer("transaction_index"),
});

export const bridgesInIndexerEvm = indexerEvm.table("bridges", {
	bridgeAddress: text("bridge_address").primaryKey().notNull(),
	feeReceiver: text("fee_receiver").notNull(),
	nativeSendAmount: numeric("native_send_amount", { precision: 78, scale: 0 }).notNull(),
	validatorAddress: text("validator_address").notNull(),
});

export const bridgedTokensInIndexerEvm = indexerEvm.table("bridged_tokens", {
	tokenAddressHex: text("token_address_hex").primaryKey().notNull(),
	tokenAddress: text("token_address"),
	isBridged: boolean("is_bridged").default(false).notNull(),
	isPaused: boolean("is_paused").default(true).notNull(),
});

export const bridgeToTokenInIndexerEvm = indexerEvm.table("bridge_to_token", {
	bridgeAddress: text("bridge_address").notNull(),
	tokenAddress: text("token_address").notNull(),
}, (table) => [
	primaryKey({ columns: [table.bridgeAddress, table.tokenAddress], name: "bridge_to_token_bridge_address_token_address_pk"}),
]);

export const receiptsClaimedInIndexerEvm = indexerEvm.table("receiptsClaimed", {
	receiptId: text("receipt_id").notNull(),
	timestamp: numeric({ precision: 78, scale:  0 }).notNull(),
	bridgeAddress: text("bridge_address").notNull(),
	to: text().notNull(),
	tokenAddressTo: text("token_address_to").notNull(),
	amountTo: numeric("amount_to", { precision: 78, scale:  0 }).notNull(),
	chainFrom: numeric("chain_from", { precision: 78, scale:  0 }).notNull(),
	chainTo: numeric("chain_to", { precision: 78, scale:  0 }).notNull(),
	eventId: numeric("event_id", { precision: 78, scale:  0 }).notNull(),
	flags: numeric({ precision: 78, scale:  0 }).notNull(),
	data: text().notNull(),
}, (table) => [
	primaryKey({ columns: [table.chainFrom, table.chainTo, table.eventId], name: "receiptsClaimed_chain_from_chain_to_event_id_pk"}),
]);

export const receiptsSentInIndexerEvm = indexerEvm.table("receiptsSent", {
	receiptId: text("receipt_id").notNull(),
	timestamp: numeric({ precision: 78, scale:  0 }).notNull(),
	bridgeAddress: text("bridge_address").notNull(),
	from: text().notNull(),
	to: text().notNull(),
	tokenAddressFrom: text("token_address_from").notNull(),
	tokenAddressTo: text("token_address_to").notNull(),
	amountFrom: numeric("amount_from", { precision: 78, scale:  0 }).notNull(),
	amountTo: numeric("amount_to", { precision: 78, scale:  0 }).notNull(),
	chainFrom: numeric("chain_from", { precision: 78, scale:  0 }).notNull(),
	chainTo: numeric("chain_to", { precision: 78, scale:  0 }).notNull(),
	eventId: numeric("event_id", { precision: 78, scale:  0 }).notNull(),
	flags: numeric({ precision: 78, scale:  0 }).notNull(),
	data: text().notNull(),
}, (table) => [
	primaryKey({ columns: [table.chainFrom, table.chainTo, table.eventId], name: "receiptsSent_chain_from_chain_to_event_id_pk"}),
]);
