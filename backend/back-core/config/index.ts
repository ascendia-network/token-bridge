import { env } from "process";
import * as dotenv from "dotenv";

import { bytesToBigInt, stringToBytes } from "viem";
// Require trick to import JSON files
import { createRequire } from "module";

const require = createRequire(import.meta.url);

dotenv.config();




export interface Config {
  networks: { [net: string]: string };
  contracts: { [net: string]: string };
  tokensConfigUrl: string;
  validators: { [net: string]: string[] };
  fees: {
    networks: {
      [net: string]: { minBridgeFeeUSD: number; };
    };
  };
}

export const stage = env.STAGE || "test";

export const stageConfig: Config = require(`../config/${stage}.json`);
export const tokensConfig = require(`../config/tokens/${stage}.json`);

export const bridgeValidators = stageConfig.validators;

export const SOLANA_CHAIN_ID = bytesToBigInt(
  stringToBytes("SOLANA", { size: 8 })
);
export const SOLANA_DEV_CHAIN_ID = bytesToBigInt(
  stringToBytes("SOLANADN", { size: 8 })
);

export const WAIT_TIME_SEC = 1*60*60;

