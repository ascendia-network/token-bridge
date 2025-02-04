import { createConfig } from "ponder";
import { http } from "viem";
import { bridgeAbi } from "./abis/bridgeAbi";


export default createConfig({
  networks: {
    base: {
      chainId: 8453,
      transport: http(process.env.PONDER_RPC_URL_8453),
    },
    amb: {
      chainId: 16718,
      transport: http(process.env.PONDER_RPC_URL_16718),
    },
    base_sepolia_test: {
      chainId: 84532,
      transport: http(process.env.PONDER_RPC_URL_84532),
    },
    amb_test: {
      chainId: 22040,
      transport: http(process.env.PONDER_RPC_URL_22040),
    },
  },
  contracts: {
    bridge: {
      abi: bridgeAbi,
      network: {
        // amb: {
        //   address: [
        //     // "0xFILL_ME", // bridgeAmbSolana
        //     // "0xFILL_ME", // bridgeAmbBase
        //   ],
        //   startBlock: Number("FILL_ME"),
        // },
        // base: {
        //   address: "0xFILL_ME", // bridgeBaseAmb
        //   startBlock: Number("FILL_ME"),
        // },
        amb_test: {
          address: [
            "0x9C3059059A1eD41e6FF90eFdCE5BC89b8FD7115A", // bridgeAmbSolana
            // "0xFILL_ME", // bridgeAmbBase
          ],
          startBlock: Number(3432270),
        },
        // base_sepolia_test: {
        //   address: "0xFILL_ME", // bridgeBaseAmb
        //   startBlock: Number("FILL_ME"),
        // }
      },
      includeTransactionReceipts: true,
    },
  },
});

(BigInt.prototype as any).toJSON = function() { return this.toString() }
