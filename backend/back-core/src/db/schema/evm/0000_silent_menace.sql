-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "indexer_evm";
--> statement-breakpoint
CREATE SEQUENCE "indexer_evm"."_reorg__receipts_operation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "indexer_evm"."_reorg__receiptsMeta_operation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "indexer_evm"."_reorg__bridges_operation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "indexer_evm"."_reorg__bridged_tokens_operation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "indexer_evm"."_reorg__bridge_to_token_operation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "indexer_evm"."receiptsMeta" (
	"receipt_id" text PRIMARY KEY NOT NULL,
	"send_block_hash" text,
	"send_block_number" numeric(78, 0),
	"send_timestamp" numeric(78, 0),
	"send_transaction_hash" text,
	"send_transaction_index" integer,
	"receive_block_hash" text,
	"receive_block_number" numeric(78, 0),
	"receive_timestamp" numeric(78, 0),
	"receive_transaction_hash" text,
	"receive_transaction_index" integer
);
--> statement-breakpoint
CREATE TABLE "indexer_evm"."bridges" (
	"bridge_address" text PRIMARY KEY NOT NULL,
	"fee_receiver" text NOT NULL,
	"native_send_amount" numeric(78, 0) NOT NULL,
	"validator_address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexer_evm"."bridged_tokens" (
	"token_address_hex" text PRIMARY KEY NOT NULL,
	"token_address" text,
	"is_bridged" boolean DEFAULT false NOT NULL,
	"is_paused" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexer_evm"."bridge_to_token" (
	"bridge_address" text NOT NULL,
	"token_address" text NOT NULL,
	CONSTRAINT "bridge_to_token_bridge_address_token_address_pk" PRIMARY KEY("bridge_address","token_address")
);
--> statement-breakpoint
CREATE TABLE "indexer_evm"."receipts" (
	"receipt_id" text NOT NULL,
	"timestamp" numeric(78, 0) NOT NULL,
	"bridge_address" text NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"token_address" text NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"chain_from" numeric(78, 0) NOT NULL,
	"chain_to" numeric(78, 0) NOT NULL,
	"event_id" numeric(78, 0) NOT NULL,
	"flags" numeric(78, 0) NOT NULL,
	"data" text NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "receipts_chain_from_chain_to_event_id_pk" PRIMARY KEY("chain_from","chain_to","event_id")
);

*/