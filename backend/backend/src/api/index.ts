import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";

import { relayGetEventSchema, relayGetEventsToSign, } from "./relay/api";
import {
  backofficeEndpoint,
  backofficeSchema,
  txHistoryEndpoint,
  txHistorySchema,
  txStatusEndpoint,
  txStatusSchema,
} from "./front";

import { allowedOrigins, apiPort } from "../configs/config";
import { getSendSignatureEndpoint, getSendSignatureSchema } from "./send";


export async function serve() {
    const fastify = Fastify({
        logger: true,
    });
    await fastify.register(cors, { origin: allowedOrigins });
    await fastify.register(websocket);

    fastify.get("/backoffice", { schema: backofficeSchema }, backofficeEndpoint);
    fastify.get("/txHistory", { schema: txHistorySchema }, txHistoryEndpoint);
    fastify.get("/txStatus", { websocket: true, schema: txStatusSchema }, txStatusEndpoint);
    fastify.get("/relay/getEvent", { schema: relayGetEventSchema }, relayGetEventsToSign);
    fastify.get("/send", { schema: getSendSignatureSchema }, getSendSignatureEndpoint);

    console.log("starting api server on port %s", apiPort);
    await fastify.listen({ host: "0.0.0.0", port: +apiPort });
}
