import fastify, { FastifyInstance } from 'fastify'
import { webhookHandler } from "./webhook/webhook-handler";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import db from "../db/db";


export async function serve() {
  await migrate(db, {
    migrationsFolder: "drizzle",
  });
  
  const server: FastifyInstance = fastify({logger: true})
  server.post('/webhook', webhookHandler)

  await server.listen({ host: "0.0.0.0", port: 8080 })
}
