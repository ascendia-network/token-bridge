-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "indexer_solana";
--> statement-breakpoint
CREATE TABLE "indexer_solana"."receipts" (
	"receipt_id" text GENERATED ALWAYS AS (((((chain_from || '_'::text) || chain_to) || '_'::text) || event_id)) STORED NOT NULL,
	"timestamp" bigint NOT NULL,
	"bridge_address" text NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"token_address" text NOT NULL,
	"amount" bigint NOT NULL,
	"chain_from" bigint NOT NULL,
	"chain_to" bigint NOT NULL,
	"event_id" bigint NOT NULL,
	"flags" bigint NOT NULL,
	"data" text NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "receipts_chain_from_chain_to_event_id_pk" PRIMARY KEY("chain_from","chain_to","event_id")
);

*/