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

// Require trick to import JSON files
import { createRequire } from "module";
import { clusterApiUrl } from "@solana/web3.js";
import {
  bytesToBigInt,
  stringToBytes,
} from "viem";
const require = createRequire(import.meta.url);

dotenv.config();

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

export const sendSignerMnemonic = env.SEND_SIGNER_MNEMONIC!;

export const stageConfig: Config = require(`../config/${stage}.json`);


export const SOLANA_CHAIN_ID = bytesToBigInt(
  stringToBytes("SOLANA", { size: 8 })
);
export const SOLANA_DEV_CHAIN_ID = bytesToBigInt(
  stringToBytes("SOLANADN", { size: 8 })
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
