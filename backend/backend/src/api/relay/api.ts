import { relayApi } from "../../db/helpers/relay-api";
import { FastifyReply, FastifyRequest } from "fastify";
import { makeSchema } from "../utils";


export const relayGetEventSchema = makeSchema({
    "networkFrom": "string",
    "networkTo": "string",
    "eventName": "string",
    "eventId": "number",
})

export async function relayGetEventsToSign(req: FastifyRequest, res: FastifyReply) {
    const { networkFrom, networkTo, eventName, eventId } = req.query as any;

    const event = await relayApi.getEvent(networkFrom, networkTo, eventName, eventId);
    res.send(event);
}

