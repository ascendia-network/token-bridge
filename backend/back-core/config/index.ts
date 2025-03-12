/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */

import { env } from "process";
import * as dotenv from "dotenv";

import { clusterApiUrl } from "@solana/web3.js";
import { Bytes } from "ox";
import type { Context } from "hono";
// Require trick to import JSON files
import { createRequire } from "module";
const require = createRequire(import.meta.url);

dotenv.config();

type CORSOptions = {
  origin:
    | string
    | string[]
    | ((origin: string, c: Context) => string | undefined | null);
  allowMethods?: string[];
  allowHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
  exposeHeaders?: string[];
};

export const CORS_CONFIG: CORSOptions = {
  origin: (origin: string, c: Context) => {
    return c.env.ALLOWED_ORIGINS ? c.env.ALLOWED_ORIGINS.split(",") : "*";
  },
  allowMethods: ["GET", "POST"],
  allowHeaders: ["Content-Type"],
};

export const RELAY_CORS_CONFIG: CORSOptions = {
  ...CORS_CONFIG,
  origin: (origin: string, c: Context) => {
    return c.env.RELAY_ALLOWED_ORIGINS ? c.env.RELAY_ALLOWED_ORIGINS.split(",") : "*";
  },
};

export const CHAIN_ID_TO_CHAIN_NAME: Record<string, string> = {
  "1": "eth",
  "56": "bsc",
  "8453": "base",
  "16718": "amb",
  "6003100671677628416": "sol",
  // testnets
  "22040": "amb-test",
  "84532": "base-test",
  "6003100671677645902": "sol-dev",
};

const networkMappping: Record<string, string> = Object.entries(
  CHAIN_ID_TO_CHAIN_NAME
).reduce(
  (acc: Record<string, string>, [key, value]: [string, string]) => ({
    ...acc,
    [value]: key,
  }),
  {} as Record<string, string>
);

export interface Config {
  networks: { [net: string]: string };
  contracts: { [net: string]: string };
  tokensConfigUrl: string;
  fees: {
    networks: {
      [net: string]: {
        minBridgeFeeUSD: number;
      };
    };
  };
}

export const stage = env.STAGE || "test";

export const stageConfig: Config = require(`../config/${stage}.json`);

export const SOLANA_CHAIN_ID = Bytes.toBigInt(
  Bytes.fromString("SOLANA", { size: 8 })
);
export const SOLANA_DEV_CHAIN_ID = Bytes.toBigInt(
  Bytes.fromString("SOLANADN", { size: 8 })
);

const solanaRPCs = {
  [`RPC_URL_${SOLANA_CHAIN_ID}`]: clusterApiUrl("mainnet-beta"),
  [`RPC_URL_${SOLANA_DEV_CHAIN_ID}`]: clusterApiUrl("devnet"),
};

export function buildRPCs(config: Config) {
  return {
    ...solanaRPCs,
    ...Object.entries(config.networks).reduce(
      (acc: Record<string, string>, [key, value]: [string, string]) => {
        if (networkMappping[key]) {
          acc[`RPC_URL_${networkMappping[key]}`] = value;
        }
        return acc;
      },
      {} as Record<string, string>
    ),
  };
}
