import { ponder } from "ponder:registry";
import { saveBridgeParam, setupBridgeParams } from "./bridgeParams";
import { saveReceiptSend, saveReceiptWithdraw } from "./receipt";
import { saveBridgeToken } from "./bridgeTokens";

const BACKEND_API_TOKEN = process.env.BACKEND_API_TOKEN;
const BACKEND_API_URL = process.env.BACKEND_API_URL;

ponder.on(`bridge:setup`, setupBridgeParams);
ponder.on(`bridge:TokenLocked`, async ({ event, context }) => {
  await saveReceiptSend(context, event);
  // await notifyBackend(event);
});
ponder.on(`bridge:TokenUnlocked`, async ({ event, context }) => {
  await saveReceiptWithdraw(context, event);
  // await notifyBackend(event);
});
ponder.on(`bridge:FeeReceiverChanged`, async ({ event, context }) => {
  await saveBridgeParam(context, event);
  // await notifyBackend(event);
});
ponder.on(`bridge:NativeSendAmountChanged`, async ({ event, context }) => {
  await saveBridgeParam(context, event);
  // await notifyBackend(event);
});

ponder.on(`bridge:ValidatorChanged`, async ({ event, context }) => {
  await saveBridgeParam(context, event);
  // await notifyBackend(event);
});

ponder.on(`bridge:TokenAdded`, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  // await notifyBackend(event);
});

ponder.on(`bridge:TokenRemoved`, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  // await notifyBackend(event);
});

ponder.on(`bridge:TokenMapped`, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  // await notifyBackend(event);
});

ponder.on(`bridge:TokenUnmapped`, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  // await notifyBackend(event);
});

ponder.on(`bridge:TokenPaused`, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  // await notifyBackend(event);
});
ponder.on(`bridge:TokenUnpaused`, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  // await notifyBackend(event);
});

ponder.on(`bridge:TokenDeployed`, async ({ event, context }) => {
  await saveBridgeToken(context, event);
  // await notifyBackend(event);
});

// async function notifyBackend(event: Event) {
//   try {
//     await fetch(BACKEND_API_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "X-Auth": BACKEND_API_TOKEN,
//       },
//       body: JSON.stringify({
//         networkFrom: network.from,
//         networkTo: network.to,
//         eventName: event.name,
//         eventId: Number((event.args as any).eventId),
//       }),
//     });
//   } catch (e) {
//     console.warn("Failed to notify backend");
//   }
// }
