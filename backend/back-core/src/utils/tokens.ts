import { stage, stageConfig } from "../../config";

interface Token {
  name: string;
  denomination: number;
  isNative?: boolean;
  isLegacy?: boolean;
}

const tokens: { [addr: string]: Token } = {
  // todo get native tokens from config (after update to new config format)
  "eth-0x0000000000000000000000000000000000000000": { name: "ETH", denomination: 18, isNative: true },
  "amb-0x0000000000000000000000000000000000000000": { name: "AMB", denomination: 18, isNative: true },
  "amb-test-0x0000000000000000000000000000000000000000": { name: "AMB", denomination: 18, isNative: true },
};

if (stage === "prod") {
  const oldSAMB = { name: "SAMB [OLD]", denomination: 18, isLegacy: true };
  tokens["eth-0x278a8c33Ef2A7D7C682f458C85E9447ce3645188"] = oldSAMB;
  tokens["bsc-0x090B99DfBd92649C1F4c093A95d99a272bd11221"] = oldSAMB;
}


export async function getToken(network: string, tokenAddress: string): Promise<Token> {
  const key = `${network}-${tokenAddress}`;

  if (tokens[key] === undefined) await fetchTokens();

  if (tokens[key] === undefined) {
    console.warn("Token %s in %s network not found in config", tokenAddress, network);
    tokens[key] = { name: tokenAddress, denomination: 0, isLegacy: true }; // save to avoid future requests
  }

  return tokens[key];
}

async function fetchTokens() {
  const resp = await fetch(stageConfig.tokensConfigUrl);
  const config: FetchedConfig = await resp.json();

  for (const token of Object.values(config.tokens)) {
    for (const [net, addr] of Object.entries(token.addresses)) {
      const key = `${net}-${addr}`;
      const denomination = net === "amb" ? token.denomination : token.decimals[net]; // todo upgrade to new config format

      tokens[key] = { name: token.symbol, denomination: denomination };
    }
  }
}

interface FetchedConfig {
  tokens: { [symb: string]: FetchedToken };
}

interface FetchedToken {
  name: string;
  symbol: string;
  denomination: number; // todo upgrade to new config format
  addresses: { [net: string]: string };
  primaryNets: string[];
  nativeAnalog: string | null;
  decimals: { [net: string]: number };
}
