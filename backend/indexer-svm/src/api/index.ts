import fastify, { FastifyInstance } from 'fastify'
import { webhookHandler } from "./webhook/webhook-handler";


export async function serve() {
  const server: FastifyInstance = fastify({logger: true})
  server.post('/webhook', webhookHandler)

  await server.listen({ host: "0.0.0.0", port: 8080 })
}
