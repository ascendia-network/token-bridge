import type { Config } from "drizzle-kit";
import { config } from "dotenv";
config({
  debug: true,
});
export default {
  dialect: "postgresql",
  schema: "./src/db/schema/evm.schema.ts",
  out: "./src/db/schema/evm/",
  casing: "snake_case",
  schemaFilter: ["indexer_evm"],
  tablesFilter: ["[!_]*"],
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
} satisfies Config;
