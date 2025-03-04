import type { Config } from "drizzle-kit";
import { config } from "dotenv";
config();

export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  schemaFilter: ["indexer_solana"],
  tablesFilter: ["[!_]*"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
