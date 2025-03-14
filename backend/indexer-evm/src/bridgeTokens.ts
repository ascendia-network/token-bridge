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
        tokenAddressHex: numberToHex(BigInt(event.args.token), { size: 32 }),
        isBridged: true,
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
        tokenAddressHex: numberToHex(BigInt(event.args.token), { size: 32 }),
      });
      break;
    }
    case "TokenPaused": {
      await context.db
        .update(bridgedTokens, {
          tokenAddressHex: numberToHex(BigInt(event.args.token), { size: 32 }),
        })
        .set({
          isPaused: true,
        });
      break;
    }
    case "TokenUnpaused": {
      await context.db
        .update(bridgedTokens, {
          tokenAddressHex: numberToHex(BigInt(event.args.token), { size: 32 }),
        })
        .set({
          isPaused: false,
        });
      break;
    }
    case "TokenDeployed": {
      await context.db.insert(bridgedTokens).values({
        tokenAddressHex: numberToHex(BigInt(event.args.token), { size: 32 }),
        tokenAddress: event.args.token,
        isBridged: true,
      }).onConflictDoNothing();
      await context.db.insert(bridgeToToken).values({
        bridgeAddress,
        tokenAddress: event.args.token,
      }).onConflictDoNothing();
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
