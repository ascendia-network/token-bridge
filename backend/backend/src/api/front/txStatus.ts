import { txStatusApi } from "../../db/helpers/frontend-api";
import { notifier } from "../../utils/notifier";
import { FastifyRequest } from "fastify";
import { SocketStream } from "@fastify/websocket";
import { makeSchema } from "../utils";
import { getToken } from "../../utils/tokens";
import { denominate, sleep } from "../../utils/utils";
import Decimal from "decimal.js";
import { BridgeConstants } from "../../utils/bridgeConstants";

interface Response {
    status: number;

    eventId?: number;
    networkFrom?: string;
    networkTo?: string;

    userAddress?: string;
    tokenFrom?: string;
    tokenTo?: string;

    amount?: string
    denominatedAmount?: string

    timeframe?: number;
    locktime?: number;

    confirmations?: number;
    minSafetyBlocks?: number;

    finishTxHash?: string;
}

export const txStatusSchema = makeSchema({
    "txHash": "string",
})

export async function txStatusEndpoint(connection: SocketStream, req: FastifyRequest) {
    const { txHash } = req.query as any;

    // todo cancelable context to reject waitFor promise when ws is closed
    const generator = statusGetterWatcher(txHash);
    for await (const response of generator) {
        console.log(JSON.stringify(response));
        connection.socket.send(JSON.stringify(response));
    }


    connection.socket.on("close", () => {
        console.info("ws disconnected");
    });
    connection.socket.on("error", (err: any) => {
        console.info("ws error", err);
    });

}

/*
status 0: waiting for withdraw event
status 1: waiting for transfer event
status 2: waiting for minSafetyBlocks to pass
status 3: waiting for transfer submit event
status 4: waiting for transfer finish event
status 5: done
 */


async function* statusGetterWatcher(txHash: string): AsyncGenerator<Response> {
    let response: Response = {
        status: 0,
    };

    // 1: wait for withdraw event

    let withdrawEvent = await txStatusApi.getWithdrawEvent(txHash);
    if (!withdrawEvent) {
        yield response;
        withdrawEvent = await waitFor("Withdraw", { txHash });

        // unmapped event :(
        withdrawEvent.tokenFrom = withdrawEvent.args.tokenFrom;
        withdrawEvent.tokenTo = withdrawEvent.args.tokenTo;
        withdrawEvent.amount = withdrawEvent.args.amount;
        withdrawEvent.userFrom = withdrawEvent.args.from;
    }
    const { networkFrom, networkTo, eventId, amount } = withdrawEvent;

    const tokenFrom = await getToken(networkFrom, withdrawEvent.tokenFrom);
    const tokenTo = await getToken(networkTo, withdrawEvent.tokenTo);

    // use side net denominations
    const denomination = networkTo === "amb" ? tokenFrom.denomination : tokenTo.denomination;
    const denominatedAmount = denominate(new Decimal(withdrawEvent.amount), denomination);

    const {timeframe, locktime, minSafetyBlocks} = await BridgeConstants.get(networkFrom, networkTo);

    response.status = 1;
    response.eventId = eventId;
    response.networkFrom = networkFrom;
    response.networkTo = networkTo;
    response.userAddress = withdrawEvent.userFrom;
    response.tokenFrom = withdrawEvent.tokenFrom;
    response.tokenTo = withdrawEvent.tokenTo;
    response.amount = withdrawEvent.amount;
    response.denominatedAmount = denominatedAmount.toFixed();
    response.timeframe = timeframe;
    response.locktime = locktime;
    response.minSafetyBlocks = minSafetyBlocks;

    // 2: wait for transfer event

    let transferEvent = await txStatusApi.getEvent("Transfer", networkFrom, networkTo, eventId);
    if (!transferEvent) {
        yield response;
        transferEvent = await waitFor("Transfer", { networkFrom, networkTo, eventId });
    }
    response.status = 2;

    // 3: wait for minSafetyBlocks to pass

    const startBlock = transferEvent.blockNumber;

    for await (const confirmations of waitForConfirmations(networkFrom, startBlock, response.minSafetyBlocks!)) {
        if (confirmations === response.confirmations) continue;  // skip if no change

        response.confirmations = confirmations;
        if (confirmations != response.minSafetyBlocks)
            // if confirmations already reached minSafetyBlocks, don't yield it; it will be yielded in the next step
            yield response;
    }

    response.status = 3;

    // 4: wait for transfer submit event

    let submitEvent = await txStatusApi.getEvent("TransferSubmit", networkTo, networkFrom, eventId);
    if (!submitEvent) {
        yield response;
        await waitFor("TransferSubmit", { networkFrom: networkTo, networkTo: networkFrom, eventId });
    }
    response.status = 4;

    // 5: wait for transfer finish event

    let finishEvent = await txStatusApi.getEvent("TransferFinish", networkTo, networkFrom, eventId);
    if (!finishEvent) {
        yield response;
        finishEvent = await waitFor("TransferFinish", { networkFrom: networkTo, networkTo: networkFrom, eventId });
    }
    response.status = 5;
    response.finishTxHash = finishEvent.txHash;

    // done

    yield response;
    return;
}

async function waitFor(eventName: string, filter: any) {
    // console.log("waiting for", eventName, filter);
    const event = await new Promise((resolve) => {
        function handler(event: any) {
            if (!Object.keys(filter).every((key) => event.event[key] === filter[key])) return;
            resolve(event.event);
            notifier.off(eventName, handler);
        }
        notifier.on(eventName, handler);
    });
    // console.log("got event", eventName);
    return event;
}

async function* waitForConfirmations(network: string, startBlock: number, minSafetyBlocks: number): AsyncGenerator<number> {
    while (true) {
        const currentBlock = await txStatusApi.getLastBlock(network);
        const confirmations = Math.min(minSafetyBlocks, currentBlock - startBlock);
        yield confirmations;
        if (confirmations >= minSafetyBlocks) {
            return;
        }
        await sleep(2000);
    }
}
