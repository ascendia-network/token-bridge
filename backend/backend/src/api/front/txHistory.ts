import { getToken } from "../../utils/tokens";
import Decimal from "decimal.js";
import { txHistoryApi } from "../../db/helpers/frontend-api";
import { denominate, sumStrings, usedGas } from "../../utils/utils";
import { FastifyReply, FastifyRequest } from "fastify";
import { makeSchema } from "../utils";

export const txHistorySchema = makeSchema({
    "userAddress": "string",
    "networkFrom?": "string",
    "networkTo?": "string",
    "limit?": "number",
    "offset?": "number",
})

export async function txHistoryEndpoint(req: FastifyRequest, res: FastifyReply) {
    const { userAddress, networkFrom, networkTo, limit, offset } = req.query as any;

    const withdraws = await txHistoryApi.getWithdraws(userAddress); //, networkFrom, networkTo, limit, offset);

    const resultsPromises = withdraws.map(async (withdraw: any) => {
        const tokenFrom = await getToken(withdraw.networkFrom, withdraw.tokenFrom);
        const tokenTo = await getToken(withdraw.networkTo, withdraw.tokenTo);

        // use side net denominations
        const denomination = withdraw.networkTo === "amb" ? tokenFrom.denomination : tokenTo.denomination;
        const denominatedAmount = denominate(new Decimal(withdraw.amount), denomination);

        return {
            eventId: withdraw.eventId,
            networkFrom: withdraw.networkFrom,
            networkTo: withdraw.networkTo,
            tokenFrom: {...tokenFrom, address: withdraw.tokenFrom},
            tokenTo: {...tokenTo, address: withdraw.tokenTo},
            userTo: withdraw.userTo,

            amount: withdraw.amount,
            denominatedAmount: denominatedAmount.toFixed(),

            fee: sumStrings([withdraw.feeTransfer, withdraw.feeBridge, usedGas(withdraw)]).toFixed(),

            withdrawTx: withdraw.txHash,
            timestampStart: withdraw.timestamp,
            transferFinishTxHash: withdraw.tfHash || "",
        };
    });

    res.send(await Promise.all(resultsPromises));
}
