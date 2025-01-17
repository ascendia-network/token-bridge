import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import mongodb from "@fastify/mongodb";
import { Config } from "./init";

const config = new Config();
const fastify = Fastify();

fastify.register(mongodb, {
  forceClose: true,
  url: config.databaseUrl,
});

async function addSignature(request: FastifyRequest, reply: FastifyReply) {
  let { authorization } = request.headers as {
    authorization?: string;
  };

  if (authorization != config.authorizationKey) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    const data = request.body;
    console.log(data);
    if (!data || typeof data !== "object") {
      return reply.status(400).send({ error: "Invalid JSON payload" });
    }
    await request.server.mongo.db
      ?.collection(config.signatureCollection)
      .insertOne(data);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: error.message });
  }
}

async function getSignature(request: FastifyRequest, reply: FastifyReply) {
  try {
    let { txHash } = request.query as {
      txHash?: string;
    };

    const messages = await request.server.mongo.db
      ?.collection(config.signatureCollection)
      .find({ txHash }, { projection: { _id: 0 } })
      .toArray();
    return reply.send(messages);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: error.message });
  }
}

async function start() {
  fastify.post("/api/signature", addSignature);
  fastify.get("/api/signature", getSignature);
  try {
    fastify.listen({
      host: config.storageHost,
      port: config.storagePort,
    });
    console.log(
      `Server running on http://${config.storageHost}:${config.storagePort}`,
    );
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

start();
