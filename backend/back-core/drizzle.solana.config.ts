import type { Config } from "drizzle-kit";
import { config } from "dotenv";
config();

export default {
  dialect: "postgresql",
  schema: "./src/db/schema/solana.schema.ts",
  out: "./src/db/schema/solana/",
  casing: "snake_case",
  schemaFilter: ["indexer_solana"],
  tablesFilter: ["[!_]*"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
