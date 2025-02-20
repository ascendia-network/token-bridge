import { defineChain } from "viem";

export const amb = defineChain({
  id: 16718,
  name: "AirDAO",
  nativeCurrency: {
    decimals: 18,
    name: "Amber",
    symbol: "AMB",
  },
  rpcUrls: {
    default: {
      http: ["http://rpc.airdao.io"],
      webSocket: ["wss://rpc.airdao.io/ws"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://airdao.io/explorer/" },
  },
  contracts: {
    multicall3: {
      address: "0x021de22a8b1B021f07a94B047AA557079BbCa6ed"
    },
  },
});

export const amb_test = defineChain({
  id: 22040,
  name: "AirDAO Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Amber",
    symbol: "AMB",
  },
  rpcUrls: {
    default: {
      http: ["https://network.ambrosus-test.io"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://testnet.airdao.io/explorer/" },
  },
  contracts: {
    multicall3: {
      address: "0xf4FBBC66fD2B6323B7360072CDF32C0F816c9836",
    },
  },
});

export const amb_dev = defineChain({
  id: 30746,
  name: "AirDAO Devnet",
  nativeCurrency: {
    decimals: 18,
    name: "Amber",
    symbol: "AMB",
  },
  rpcUrls: {
    default: {
      http: ["https://network.ambrosus-dev.io"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://devnet.airdao.io/explorer/" },
  },
  contracts: {
    multicall3: {
      address: "0x03d6b0F35b62400D89Ce1D1A1C0Fb30A04b4dc90",
    },
  },
});
