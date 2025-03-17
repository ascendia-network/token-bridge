import { createConfig, type NetworkConfig } from "ponder";
import { http, webSocket } from "viem";
import { bridgeAbi } from "./abis/bridgeAbi";
import { loadBalance } from "@ponder/utils";

const baseTransports = [
  "https://base.llamarpc.com",
  "https://base-rpc.publicnode.com",
  "wss://base-rpc.publicnode.com",
  "https://0xrpc.io/base",
  "https://mainnet.base.org",
  "https://1rpc.io/base",
  "https://base.drpc.org",
  "wss://base.callstaticrpc.com",
];

const baseSepoliaTransports = [
  "https://sepolia.base.org",
  "https://base-sepolia-rpc.publicnode.com",
  "wss://base-sepolia-rpc.publicnode.com",
  "https://base-sepolia.gateway.tenderly.co",
];

const ambTransports = ["https://network-archive.ambrosus.io/"];

const ambTestTransports = ["https://network-archive.ambrosus-test.io/"];

const amb = {
  chainId: 16718,
  transport: loadBalance(getTransports(16718)),
} as const satisfies NetworkConfig;

const base = {
  chainId: 8453,
  transport: loadBalance(getTransports(8453)),
} as const satisfies NetworkConfig;

const base_sepolia = {
  chainId: 84532,
  transport: loadBalance(getTransports(84532)),
} as const satisfies NetworkConfig;

const amb_test = {
  chainId: 22040,
  transport: loadBalance(getTransports(22040)),
} as const satisfies NetworkConfig;

export default createConfig({
  networks: {
    base,
    amb,
    base_sepolia,
    amb_test,
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
            "0x5Bcb9233DfEbcec502C1aCce6fc94FefF8c037C3", // bridgeAmbSolana
          ],
          startBlock: Number(3531799),
        },
        // base_sepolia_test: {
        //   address: "0xFILL_ME", // bridgeBaseAmb
        //   startBlock: Number("FILL_ME"),
        // }
      },
      // includeTransactionReceipts: true,
    },
  },
});

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

function getTransports(chainId: number) {
  let transports: Set<string>;
  switch (chainId) {
    case 8453:
      transports = new Set(baseTransports);
      break;
    case 84532:
      transports = new Set(baseSepoliaTransports);
      break;
    case 16718:
      transports = new Set(ambTransports);
      break;
    case 22040:
      transports = new Set(ambTestTransports);
      break;
    default:
      throw new Error(`Unknown chainId: ${chainId}`);
  }
  const envChain = process.env[`PONDER_RPC_URL_${chainId}`];
  if (envChain) {
    transports.add(envChain);
  }
  return new Array(...transports).map((url) => {
    if(url.startsWith("wss://") || url.startsWith("ws://")) {
      return webSocket(url);
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      return http(url);
    } else {
      throw new Error(`Unknown transport: ${url}`);
    }
  });
}
