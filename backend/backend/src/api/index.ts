import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";

import {
  relayFeeEndpoint,
  relayFeeSchema,
  relayGetEventEndpoint,
  relayGetEventSchema,
  relayWaitEventEndpoint,
  relayWaitEventSchema,
} from "./relay/api";
import {
  backofficeEndpoint,
  backofficeSchema,
  txHistoryEndpoint,
  txHistorySchema,
  txStatusEndpoint,
  txStatusSchema,
} from "./front";

import { allowedOrigins, apiPort } from "../configs/config";

import { logger } from "../utils/logger";
import { BridgeConstants } from "../utils/bridgeConstants";

export async function serve() {
    const fastify = Fastify({
        logger: true,
    });
    await fastify.register(cors, { origin: allowedOrigins });
    await fastify.register(websocket);

    fastify.get("/backoffice", { schema: backofficeSchema }, backofficeEndpoint);
    fastify.get("/txHistory", { schema: txHistorySchema }, txHistoryEndpoint);
    fastify.get("/txStatus", { websocket: true, schema: txStatusSchema }, txStatusEndpoint);
    fastify.get("/relay/getEvent", { schema: relayGetEventSchema }, relayGetEventEndpoint);
    fastify.get("/relay/waitEvent", { websocket: true, schema: relayWaitEventSchema }, relayWaitEventEndpoint);
    fastify.get("/relay/fee", { schema: relayFeeSchema }, relayFeeEndpoint);
    fastify.get("/die", () => process.exit(69));

    logger.info("starting api server on port %s", apiPort);
    await fastify.listen({ host: "0.0.0.0", port: +apiPort });
}
