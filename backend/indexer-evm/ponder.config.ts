import { createConfig } from "ponder";
import { http } from "viem";
import { bridgeAbi } from "./abis/bridgeAbi";


export default createConfig({
  networks: {
    eth: {
      chainId: 1,
      transport: http(process.env.PONDER_RPC_URL_ETH),
      pollingInterval: 15_000,
    },
    amb: {
      chainId: 16718,
      transport: http(process.env.PONDER_RPC_URL_AMB),
      pollingInterval: 15_000,
    },
    bsc: {
      chainId: 56,
      transport: http(process.env.PONDER_RPC_URL_BSC),
      pollingInterval: 15_000,
    },
  },
  contracts: {

    bridgeAmbEth: {
      abi: bridgeAbi,
      address: "0x19caBC1E34Ab0CC5C62DaA1394f6022B38b75c78",
      network: "amb",
      startBlock: 19587791,
      includeTransactionReceipts: true,
    },
    bridgeAmbBsc: {
      abi: bridgeAbi,
      address: "0xe10eB55f6EeF66218BbE58B749428ec4A51D6659",
      network: "amb",
      startBlock: 19942481,
      includeTransactionReceipts: true,
    },
    bridgeEthAmb: {
      abi: bridgeAbi,
      address: "0x0De2669e8A7A6F6CC0cBD3Cf2D1EEaD89e243208",
      network: "eth",
      startBlock: 15174683,
      includeTransactionReceipts: true,
    },
    bridgeBscAmb: {
      abi: bridgeAbi,
      address: "0x92fa52d3043725D00Eab422440C4e9ef3ba180d3",
      network: "bsc",
      startBlock: 20289861,
      includeTransactionReceipts: true,
    },

  },


});

BigInt.prototype.toJSON = function() { return this.toString() }
