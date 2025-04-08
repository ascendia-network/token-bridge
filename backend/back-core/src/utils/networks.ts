import { SOLANA_CHAIN_ID, SOLANA_DEV_CHAIN_ID } from "../../config";

export class Networks {


  static isSolana(network: bigint): boolean {
    switch (network) {
      case SOLANA_CHAIN_ID:
      case SOLANA_DEV_CHAIN_ID:
        return true;
      default:
        return false;
    }
  }
}
