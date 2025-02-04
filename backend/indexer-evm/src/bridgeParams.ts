import { Context, Event } from "ponder:registry";
import { bridgeParams, receipt } from "ponder:schema";
import { zeroAddress } from "viem";

export async function setupBridgeParams(args: {
  context: Context;
  event: Event<"bridge:setup">;
}) {
  const { client } = args.context;
  const { bridge } = args.context.contracts;
  const entries = [];
  if (bridge.address)
    for (const address of bridge.address) {
      const feeReceiver = await client.readContract({
        abi: bridge.abi,
        address,
        functionName: "feeReceiver",
        args: [],
      });
      const nativeSendAmount = await client.readContract({
        abi: bridge.abi,
        address,
        functionName: "nativeSendAmount",
        args: [],
      });
      const validatorAddress = await client.readContract({
        abi: bridge.abi,
        address,
        functionName: "validator",
        args: [],
      });
      entries.push({
        bridgeAddress: address,
        feeReceiver,
        nativeSendAmount,
        validatorAddress,
      });
    }
  await args.context.db
    .insert(bridgeParams)
    .values(entries)
    .onConflictDoNothing();
  console.log("Bridge params setup complete");
}

export async function saveBridgeParam(
  context: Context,
  event: Event<
    "bridge:FeeReceiverChanged"
    | "bridge:NativeSendAmountChanged"
    | "bridge:ValidatorChanged"
  >
): Promise<string> {
  console.log(event);
  const bridgeAddress = event.log.address;
  const { client } = context;
  const { bridge } = context.contracts;
  let feeReceiver, nativeSendAmount, validatorAddress;
  try {
    feeReceiver = await client.readContract({
      abi: bridge.abi,
      address: bridgeAddress,
      functionName: "feeReceiver",
      args: [],
    });
  } catch (e) {
    feeReceiver = zeroAddress;
  }
  try {
    nativeSendAmount = await client.readContract({
      abi: bridge.abi,
      address: bridgeAddress,
      functionName: "nativeSendAmount",
      args: [],
    });
  } catch (e) {
    nativeSendAmount = BigInt(0);
  }
  try {
    validatorAddress = await client.readContract({
      abi: bridge.abi,
      address: bridgeAddress,
      functionName: "validator",
      args: [],
    });
  } catch (e) {
    validatorAddress = zeroAddress;
  }
  switch (event.name) {
    case "FeeReceiverChanged": {
      await context.db
        .insert(bridgeParams)
        .values({
          bridgeAddress,
          feeReceiver: event.args.newFeeReceiver,
          nativeSendAmount,
          validatorAddress,
        })
        .onConflictDoUpdate({
          feeReceiver: event.args.newFeeReceiver
        });
      break;
    }
    case "NativeSendAmountChanged": {
      await context.db
        .insert(bridgeParams)
        .values({
          bridgeAddress,
          nativeSendAmount: event.args.newNativeSendAmount,
          validatorAddress,
          feeReceiver,
        })
        .onConflictDoUpdate({
          nativeSendAmount: event.args.newNativeSendAmount
        });
      break;
    }
    case "ValidatorChanged": {
      await context.db
        .insert(bridgeParams)
        .values({
          bridgeAddress,
          validatorAddress: event.args.newValidator,
          feeReceiver,
          nativeSendAmount,
          })
        .onConflictDoUpdate({
          validatorAddress: event.args.newValidator
        });
      break;
    }
  }
  return bridgeAddress;
}
