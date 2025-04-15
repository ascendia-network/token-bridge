import { tokensConfig } from "../../config";

type NetworkInfo = {
  address: string;
  denomination: number;
  isPrimary: boolean;
  nativeCoin?: string;
};

type Token = {
  isActive: boolean;
  name: string;
  symbol: string;
  ticker: string;
  logo: string;
  networks: Record<string, NetworkInfo>;
};

type NetworkSpecificToken = Token & NetworkInfo;

type TokenMap = Record<string, Token>;
type TokenParsedMap = Record<string, NetworkSpecificToken>;

export class TokenRegistry {
  private tokens: TokenParsedMap;

  constructor(config: { tokens: TokenMap }) {
    this.tokens = {};
    for (const token of Object.values(config.tokens)) {
      for (const networkKey in token.networks) {
        const netInfo = token.networks[networkKey];
        const networkToken = { ...token, ...netInfo };

        const key = `${networkKey}-${netInfo.address}`.toLowerCase();
        this.tokens[key] = networkToken;

        if (netInfo.nativeCoin) {
          const key = `${networkKey}-NATIVE`.toLowerCase();
          this.tokens[key] = networkToken;
        }
      }
    }
  }

  getToken(network: string, address?: string): NetworkSpecificToken | undefined {
    const key = `${network}-${address ?? "NATIVE"}`.toLowerCase();
    const token =  this.tokens[key];
    if (!token)
      console.warn(`Token not found for ${network} ${address}`);
    return token;
  }
}

export const tokens = new TokenRegistry(tokensConfig)
