import { ponder, type Event, type Context, type EventNames } from "ponder:registry";
import { bridgeEvent } from "../ponder.schema";
import { toHex } from "viem";


const BACKEND_API_TOKEN = process.env.BACKEND_API_TOKEN
const BACKEND_API_URL = process.env.BACKEND_API_URL

interface NetworkPair {
  from: string,
  to: string
}

const networks = [
  { from: "amb", to: "eth", bridgeName: "bridgeAmbEth" },
  { from: "amb", to: "bsc", bridgeName: "bridgeAmbBsc" },
  { from: "eth", to: "amb", bridgeName: "bridgeEthAmb" },
  { from: "bsc", to: "amb", bridgeName: "bridgeBscAmb" },
]


for (const network of networks) {
  const { bridgeName } = network;

  ponder.on(`${bridgeName}:Withdraw` as EventNames, async ({ event, context }) => {
    await saveEvent(context, event, network);
    await notifyBackend(event, network);
  });
  ponder.on(`${bridgeName}:Transfer` as EventNames, async ({ event, context }) => {
    await saveEvent(context, event, network);
    await notifyBackend(event, network);
  });
  ponder.on(`${bridgeName}:TransferSubmit` as EventNames, async ({ event, context }) => {
    await saveEvent(context, event, network);
    await notifyBackend(event, network);
  });
  ponder.on(`${bridgeName}:TransferFinish` as EventNames, async ({ event, context }) => {
    await saveEvent(context, event, network);
    await notifyBackend(event, network);
  });

  ponder.on(`${bridgeName}:Paused` as EventNames, async ({ event, context }) => {
    await notifyBackend(event, network);
  });
  ponder.on(`${bridgeName}:Unpaused` as EventNames, async ({ event, context }) => {
    await notifyBackend(event, network);
  });


}


async function notifyBackend(event: Event, network: NetworkPair) {
  try {
    await fetch(BACKEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth": BACKEND_API_TOKEN
      },
      body: JSON.stringify({
        networkFrom: network.from,
        networkTo: network.to,
        eventName: event.name,
        eventId: Number((event.args as any).eventId),
      }),
    });
  } catch (e) {
    console.warn("Failed to notify backend");
  }

}


async function saveEvent(context: Context, event: Event, network: NetworkPair) {
  const id = `${network.from}-${network.to}:${event.log.id}`;

  const log = {
    blockNumber: toHex(event.block.number),
    blockHash: event.block.hash,
    transactionIndex: toHex(event.transaction.transactionIndex),
    removed: event.log.removed,
    address: event.log.address,
    data: event.log.data,
    topics: event.log.topics,
    transactionHash: event.transaction.hash,
    logIndex: toHex(event.log.logIndex),
  };
  const withdrawFields =
    event.name === "Withdraw" ?
      {
        tokenFrom: event.args.tokenFrom,
        tokenTo: event.args.tokenTo,

        userFrom: event.args.from,
        userTo: event.args.from, // frontend always set userTo = userFrom

        amount: event.args.amount,

        feeTransfer: event.args.transferFeeAmount,
        feeBridge: event.args.bridgeFeeAmount,
      } :
      {};


  await context.db.insert(bridgeEvent).values({
    id,

    networkFrom: network.from,
    networkTo: network.to,

    eventName: event.name,
    eventId: (event.args as any).eventId,

    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,

    jsonLog: JSON.stringify(log),

    blockNumber: Number(event.block.number),
    gasUsed: event.transactionReceipt.gasUsed,
    gasPrice: event.transactionReceipt.effectiveGasPrice ?? event.transaction.gasPrice,
    methodId: event.transaction.input.substring(0, 10),
    timestamp: Number(event.block.timestamp),

    ...withdrawFields
  });

  return id;
}
