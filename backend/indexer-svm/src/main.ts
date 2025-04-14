import { serve } from "./api";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import db from "./db/db";


async function main() {
  await migrate(db, {
    migrationsFolder: "drizzle",
  });

  serve()
}

main()
