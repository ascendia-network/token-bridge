import { denominate, getGasUsedByRelay } from "../../utils/utils";
import { getToken } from "../../utils/tokens";
import { backofficeApi } from "../../db/helpers/frontend-api";
import Decimal from "decimal.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { makeSchema } from "../utils";


export const backofficeSchema = makeSchema({
    "networkFrom": "string",
    "networkTo": "string",
    "eventFrom?": "number",
    "eventTo?": "number",
})

export async function backofficeEndpoint(req: FastifyRequest, res: FastifyReply) {
    const { networkFrom, networkTo, eventFrom, eventTo } = req.query as any;

    const eventsById = await backofficeApi.getEvents(networkFrom, networkTo, eventFrom, eventTo);

    const resultsPromises = Object.values(eventsById).map(async (events: any) => {
        const { withdraws, transfer, transferSubmit, transferFinish } = events;
        const eventId = withdraws[0]?.eventId || transfer?.eventId || transferSubmit?.eventId || transferFinish?.eventId;

        // withdraw is always present, status minimum 2/5
        // add +1 to status for each event type present with eventId id
        const status = 2 + [transfer, transferSubmit, transferFinish].filter(Boolean).length;

        const gasUsedByRelay = getGasUsedByRelay(transfer, transferSubmit, transferFinish);

        const withdrawPromises = withdraws.map(async (withdraw: any) => {
            const tokenFrom = await tokenInfo(withdraw.tokenFrom, networkFrom);
            const tokenTo = await tokenInfo(withdraw.tokenTo, networkTo);

            // use side net denominations
            const denomination = networkTo === "amb" ? tokenFrom.denomination : tokenTo.denomination;
            const denominatedAmount = denominate(new Decimal(withdraw.amount), denomination);

            return {
                userAddress: withdraw.userFrom,
                tokenFrom,
                tokenTo,

                amount: withdraw.amount,
                denominatedAmount: denominatedAmount.toFixed(),

                feeTransfer: withdraw.feeTransfer,
                feeBridge: withdraw.feeBridge,

                withdrawTx: txInfo(withdraw),
            };
        });

        return {
            eventId,
            status,
            transfers: await Promise.all(withdrawPromises),

            transferTx: txInfo(transfer),
            transferSubmitTx: txInfo(transferSubmit),
            transferFinishTx: txInfo(transferFinish),

            gasUsedByRelay,
        };
    });

    res.send(await Promise.all(resultsPromises));
}


function txInfo(event?: any) {
    if (!event) return {};
    return {
        txHash: event.txHash,
        txTimestamp: event.timestamp,
    };
}

async function tokenInfo(address: string, network: string) {
    const token = await getToken(network, address);
    return {
        ...token,
        address,
        network,
    };
}

