/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */

import { env } from "process";
import path from "path";

export interface Config {
  networks: { [net: string]: string };
  contracts: { [net: string]: string };
  fees: {
    networks: {
      [net: string]: {
        minBridgeFeeUSD: number;
      }
    }
  };
}

export const stage = env.STAGE || "prod";

export const sendSignerPK = env.SEND_SIGNER_PK!;
export const stageConfig: Config = require(path.resolve(__dirname, `../config/${stage}.json`));



