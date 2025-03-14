import * as backend from "./backend";
import * as evm from "./evm";
import * as solana from "./solana";
export {
  SOLANA_CHAIN_ID,
  SOLANA_DEV_CHAIN_ID,
  rpcs,
  backendUrl,
} from "./config";
export { evm, solana, backend };
