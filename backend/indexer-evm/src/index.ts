import {
  ponder,
  type Event,
  type Context,
  type EventNames,
} from "ponder:registry";
import { saveBridgeParam, setupBridgeParams } from "./bridgeParams";
import { saveReceipt } from "./receipt";
import { saveBridgeToken } from "./bridgeTokens";

const BACKEND_API_TOKEN = process.env.BACKEND_API_TOKEN;
const BACKEND_API_URL = process.env.BACKEND_API_URL;

ponder.on(`bridge:setup`, setupBridgeParams)
ponder.on(`bridge:TokenLocked` as EventNames, async ({ event, context }) => {
  await saveReceipt(context, event);
  // await notifyBackend(event);
});
ponder.on(`bridge:TokenUnlocked` as EventNames, async ({ event, context }) => {
  await saveReceipt(context, event);
  // await notifyBackend(event);
});
ponder.on(
  `bridge:FeeReceiverChanged` as EventNames,
  async ({ event, context }) => {
    await saveBridgeParam(context, event);
    // await notifyBackend(event);
  }
);
ponder.on(
  `bridge:NativeSendAmountChanged` as EventNames,
  async ({ event, context }) => {
    await saveBridgeParam(context, event);
    await notifyBackend(event);
  }
);

ponder.on(
  `bridge:ValidatorChanged` as EventNames,
  async ({ event, context }) => {
    await saveBridgeParam(context, event);
    await notifyBackend(event);
  }
);

ponder.on(`bridge:TokenAdded` as EventNames, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  await notifyBackend(event);
});

ponder.on(`bridge:TokenRemoved` as EventNames, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  await notifyBackend(event);
});

ponder.on(`bridge:TokenMapped` as EventNames, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  await notifyBackend(event);
});

ponder.on(`bridge:TokenUnmapped` as EventNames, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  await notifyBackend(event);
});

ponder.on(`bridge:TokenPaused` as EventNames, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  await notifyBackend(event);
});
ponder.on(`bridge:TokenUnpaused` as EventNames, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  await notifyBackend(event);
});

ponder.on(`bridge:TokenDeployed` as EventNames, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  await notifyBackend(event);
});

async function notifyBackend(event: Event) {
  try {
    await fetch(BACKEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth": BACKEND_API_TOKEN,
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

async function saveEvent(context: Context, event: Event) {
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
    event.name === "Withdraw"
      ? {
          tokenFrom: event.args.tokenFrom,
          tokenTo: event.args.tokenTo,

          userFrom: event.args.from,
          userTo: event.args.from, // frontend always set userTo = userFrom

          amount: event.args.amount,

          feeTransfer: event.args.transferFeeAmount,
          feeBridge: event.args.bridgeFeeAmount,
        }
      : {};

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
    gasPrice:
      event.transactionReceipt.effectiveGasPrice ?? event.transaction.gasPrice,
    methodId: event.transaction.input.substring(0, 10),
    timestamp: Number(event.block.timestamp),

    ...withdrawFields,
  });

  return id;
}
