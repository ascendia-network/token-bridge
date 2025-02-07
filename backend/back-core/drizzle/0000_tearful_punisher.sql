CREATE SCHEMA "bridge";
--> statement-breakpoint
CREATE TABLE "bridge"."signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" text NOT NULL,
	"signed_by" text NOT NULL,
	"signature" text NOT NULL
);
--> statement-breakpoint
CREATE MATERIALIZED VIEW "bridge"."receipts" AS (
	select distinct on ("unioned"."receipt_id") "receipt_id",
		"timestamp",
		"bridge_address",
		"from",
		"to",
		"token_address",
		"amount",
		"chain_from",
		"chain_to",
		"event_id",
		"flags",
		"data",
		"claimed"
	from (
			(
				select "receipt_id",
					"timestamp",
					"bridge_address",
					"from",
					"to",
					"token_address",
					"amount",
					"chain_from",
					"chain_to",
					"event_id",
					"flags",
					"data",
					"claimed"
				from "indexer_evm"."receipts"
				order by "indexer_evm"."receipts"."claimed" desc,
					"indexer_evm"."receipts"."timestamp"
			)
			union
			(
				select "receipt_id",
					"timestamp",
					"bridge_address",
					"from",
					"to",
					"token_address",
					"amount",
					"chain_from",
					"chain_to",
					"event_id",
					"flags",
					"data",
					"claimed"
				from "indexer_svm"."receipts"
				order by "indexer_svm"."receipts"."claimed" desc,
					"indexer_svm"."receipts"."timestamp"
			)
		) "unioned"
	order by "unioned"."receipt_id",
		"unioned"."timestamp",
		"unioned"."claimed" desc
);