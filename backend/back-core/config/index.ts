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

