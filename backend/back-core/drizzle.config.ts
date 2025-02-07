import type { Config } from "drizzle-kit";
import { config } from "dotenv";
config({
  debug: true,
});

export default {
  dialect: "postgresql",
  schema: "./src/db/schema/core.schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  schemaFilter: ["bridge"],
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
} satisfies Config;
