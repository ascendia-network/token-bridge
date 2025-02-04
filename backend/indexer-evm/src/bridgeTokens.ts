import { Context, Event } from "ponder:registry";
import {
  bridgedTokens,
  bridgeParams,
  bridgeToToken,
  receipt,
} from "ponder:schema";
import { numberToHex } from "viem";

export async function saveBridgeToken(
  context: Context,
  event: Event<
    | "bridge:TokenAdded"
    | "bridge:TokenRemoved"
    | "bridge:TokenMapped"
    | "bridge:TokenUnmapped"
    | "bridge:TokenPaused"
    | "bridge:TokenUnpaused"
    | "bridge:TokenDeployed"
  >
): Promise<string> {
  const bridgeAddress = event.log.address as `0x${string}`;
  switch (event.name) {
    case "TokenAdded": {
      await context.db.insert(bridgedTokens).values({
        tokenAddress: event.args.tokenAddress,
        chainId: numberToHex(context.network.chainId, { size: 32 }),
      });
      await context.db.insert(bridgeToToken).values({
        bridgeAddress,
        tokenAddress: event.args.tokenAddress,
      });
      break;
    }
    case "TokenRemoved": {
      await context.db.delete(bridgeToToken, {
        tokenAddress: event.args.tokenAddress,
        bridgeAddress: bridgeAddress,
      });
      await context.db.delete(bridgedTokens, {
        tokenAddress: event.args.tokenAddress,
      });
      break;
    }
    case "TokenPaused": {
      await context.db
        .update(bridgedTokens, {
          tokenAddress: event.args.tokenAddress,
        })
        .set({
          isPaused: true,
        });
      break;
    }
    case "TokenUnpaused": {
      await context.db
        .update(bridgedTokens, {
          tokenAddress: event.args.tokenAddress,
        })
        .set({
          isPaused: false,
        });
      break;
    }
    case "TokenDeployed": {
      await context.db.insert(bridgedTokens).values({
        tokenAddress: event.args.tokenAddress,
        chainId: numberToHex(context.network.chainId, { size: 32 }),
        isBridged: true,
      });
      await context.db.insert(bridgeToToken).values({
        bridgeAddress,
        tokenAddress: event.args.tokenAddress,
      });
      break;
    }
    // TODO: deal with mapping and unmapping
    case "TokenMapped": {
      break;
    }
    case "TokenUnmapped": {
      break;
    }
  }
}
