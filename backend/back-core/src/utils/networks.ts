import { bridgeValidators, SOLANA_CHAIN_ID, SOLANA_DEV_CHAIN_ID } from "../../config";

export class Networks {

  static isEVM(network: bigint): boolean {
    return !this.isSolana(network);
  }

  static supportedNetworks(): bigint[] {
    return Object.keys(bridgeValidators).map((networkString) => BigInt(networkString));
  }

  static isSupportedNetwork(network: bigint): boolean {
    return this.supportedNetworks().includes(network);
  }


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
