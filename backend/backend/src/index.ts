import { serve } from "./api";
import { BridgeConstants } from "./utils/bridgeConstants";


async function main() {
  await BridgeConstants.create();
  await serve();
}

main();
