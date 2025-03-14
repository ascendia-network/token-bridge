CREATE SCHEMA "indexer_solana";
--> statement-breakpoint
CREATE TABLE "indexer_solana"."receiptsClaimed" (
	"receipt_id" text NOT NULL,
	"timestamp" numeric(78, 0) NOT NULL,
	"bridge_address" text NOT NULL,
	"to" text NOT NULL,
	"token_address_to" text NOT NULL,
	"amount_to" numeric(78, 0) NOT NULL,
	"chain_to" numeric(78, 0) NOT NULL,
	"chain_from" numeric(78, 0) NOT NULL,
	"event_id" numeric(78, 0) NOT NULL,
	"flags" numeric(78, 0) NOT NULL,
	"data" text NOT NULL,
	CONSTRAINT "receiptsClaimed_chain_to_event_id_pk" PRIMARY KEY("chain_to","event_id")
);
--> statement-breakpoint
CREATE TABLE "indexer_solana"."receiptsMeta" (
	"receipt_id" text PRIMARY KEY NOT NULL,
	"block_hash" text,
	"block_number" numeric(78, 0),
	"timestamp" numeric(78, 0),
	"transaction_hash" text,
	"transaction_index" integer
);
--> statement-breakpoint
CREATE TABLE "indexer_solana"."receiptsSent" (
	"receipt_id" text NOT NULL,
	"timestamp" numeric(78, 0) NOT NULL,
	"bridge_address" text NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"token_address_from" text NOT NULL,
	"token_address_to" text NOT NULL,
	"amount_from" numeric(78, 0) NOT NULL,
	"amount_to" numeric(78, 0) NOT NULL,
	"chain_from" numeric(78, 0) NOT NULL,
	"chain_to" numeric(78, 0) NOT NULL,
	"event_id" numeric(78, 0) NOT NULL,
	"flags" numeric(78, 0) NOT NULL,
	"data" text NOT NULL,
	CONSTRAINT "receiptsSent_chain_from_chain_to_event_id_pk" PRIMARY KEY("chain_from","chain_to","event_id")
);
