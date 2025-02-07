import { type Context, type Event} from "ponder:registry";
import {
  bridgedTokens,
  bridgeToToken,
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
) {
  const bridgeAddress = event.log.address as `0x${string}`;
  switch (event.name) {
    case "TokenAdded": {
      await context.db.insert(bridgedTokens).values({
        tokenAddress: event.args.token,
        chainId: numberToHex(context.network.chainId, { size: 32 }),
      });
      await context.db.insert(bridgeToToken).values({
        bridgeAddress,
        tokenAddress: event.args.token,
      });
      break;
    }
    case "TokenRemoved": {
      await context.db.delete(bridgeToToken, {
        tokenAddress: event.args.token,
        bridgeAddress: bridgeAddress,
      });
      await context.db.delete(bridgedTokens, {
        tokenAddress: event.args.token,
      });
      break;
    }
    case "TokenPaused": {
      await context.db
        .update(bridgedTokens, {
          tokenAddress: event.args.token,
        })
        .set({
          isPaused: true,
        });
      break;
    }
    case "TokenUnpaused": {
      await context.db
        .update(bridgedTokens, {
          tokenAddress: event.args.token,
        })
        .set({
          isPaused: false,
        });
      break;
    }
    case "TokenDeployed": {
      await context.db.insert(bridgedTokens).values({
        tokenAddress: event.args.token,
        chainId: numberToHex(context.network.chainId, { size: 32 }),
        isBridged: true,
      });
      await context.db.insert(bridgeToToken).values({
        bridgeAddress,
        tokenAddress: event.args.token,
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
