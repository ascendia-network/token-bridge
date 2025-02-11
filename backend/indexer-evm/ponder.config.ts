import { createConfig, type NetworkConfig } from "ponder";
import { http, webSocket } from "viem";
import { bridgeAbi } from "./abis/bridgeAbi";
import { loadBalance } from "@ponder/utils";

const baseTransports = [
  http("https://base.llamarpc.com"),
  http("https://base-rpc.publicnode.com"),
  webSocket("wss://base-rpc.publicnode.com"),
  http("https://0xrpc.io/base"),
  http("https://mainnet.base.org"),
  http("https://1rpc.io/base"),
  http("https://base.drpc.org"),
  webSocket("wss://base.callstaticrpc.com"),
];

const baseSepoliaTransports = [
  http("https://sepolia.base.org"),
  http("https://base-sepolia-rpc.publicnode.com"),
  webSocket("wss://base-sepolia-rpc.publicnode.com"),
  http("https://base-sepolia.gateway.tenderly.co"),
];

const ambTransports = [http("https://network-archive.ambrosus.io/")];

const ambTestTransports = [http("https://network-archive.ambrosus-test.io/")];

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
            "0x2d54647D121a4a5182D73D007feF1ac6FD208A41", // bridgeAmbSolana
            // "0xFILL_ME", // bridgeAmbBase
          ],
          startBlock: Number(3432270),
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

(BigInt.prototype as any).toJSON = function() { return this.toString() }

function getTransports(chainId: number) {
  let transports;
  switch (chainId) {
    case 8453:
      transports = baseTransports;
      break;
    case 84532:
      transports = baseSepoliaTransports;
      break;
    case 16718:
      transports = ambTransports;
      break;
    case 22040:
      transports = ambTestTransports;
      break;
    default:
      throw new Error(`Unknown chainId: ${chainId}`);
  }
  const envChain = process.env[`PONDER_RPC_URL_${chainId}`];
  if (envChain) {
    transports.push(http(envChain));
  }
  return transports;
}