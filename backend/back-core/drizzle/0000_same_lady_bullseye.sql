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
	select "receipt_id",
		"timestamp",
		"bridge_address",
		"from",
		"to",
		"token_address_from",
		"token_address_to",
		"amount_from",
		"amount_to",
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
					"token_address_from",
					"token_address_to",
					"amount_from",
					"amount_to",
					"chain_from",
					"chain_to",
					"event_id",
					"flags",
					"data",
					exists (
						select 1
						from "indexer_solana"."receiptsClaimed"
						where "indexer_evm"."receiptsSent"."receipt_id" = "indexer_solana"."receiptsClaimed"."receipt_id"
					) as "claimed"
				from "indexer_evm"."receiptsSent"
				order by "indexer_evm"."receiptsSent"."timestamp"
			)
			union all
			(
				select "receipt_id",
					"timestamp",
					"bridge_address",
					"from",
					"to",
					"token_address_from",
					"token_address_to",
					"amount_from",
					"amount_to",
					"chain_from",
					"chain_to",
					"event_id",
					"flags",
					"data",
					exists (
						select 1
						from "indexer_evm"."receiptsClaimed"
						where "indexer_solana"."receiptsSent"."receipt_id" = "indexer_evm"."receiptsClaimed"."receipt_id"
					) as "claimed"
				from "indexer_solana"."receiptsSent"
				order by "indexer_solana"."receiptsSent"."timestamp"
			)
		) "unioned"
	order by "unioned"."timestamp",
		"claimed" desc
);