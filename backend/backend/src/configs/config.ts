import path from "path";
import { env } from "process";
import Decimal from "decimal.js";


export interface Config {
  networks: { [net: string]: string };
  contracts: { [net: string]: string };
  fees: {
    networks: { [net: string]: {
        minBridgeFeeUSD: number;
      } }
  };
}


export const stage = env.STAGE || "prod";
export const apiPort = env.PORT || 8080;


export const sendSignerPK = env.SEND_SIGNER_PK!;


export const ponderGraphQlUrl = "http://localhost:42069/graphql";

export const stageConfig: Config = require(path.resolve(__dirname, `../configs/${stage}.json`));

export let allowedOrigins: string | string[] | RegExp[] = "*";
if (stage === "prod") {
    allowedOrigins = [/https:\/\/.*ambrosus\.io$/, /https:\/\/.*airdao\.io$/, /https:\/\/.*amplifyapp\.com$/];
}

// loosing digits after decimal point without this
Decimal.set({ precision: 100 })
