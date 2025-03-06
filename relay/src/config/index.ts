import { config as dotenvConfig } from "dotenv";
import { type HDAccount, mnemonicToAccount } from "viem/accounts";
import { getSolanaAccount } from "../solana/getAccount";
import { EnvConfig, RPCConfig } from "./configValidators";
import { clusterApiUrl, Connection, type Keypair } from "@solana/web3.js";
import { bytesToBigInt, stringToBytes } from "viem";
dotenvConfig();

export const SOLANA_CHAIN_ID = bytesToBigInt(stringToBytes("SOLANA", { size: 8 }));
export const SOLANA_DEV_CHAIN_ID = bytesToBigInt(
  stringToBytes("SOLANADN", { size: 8 })
);

const solanaRPCs = {
  [`RPC_URL_${SOLANA_CHAIN_ID}`]: new Connection(
    clusterApiUrl("mainnet-beta"),
    "confirmed"
  ),
  [`RPC_URL_${SOLANA_DEV_CHAIN_ID}`]: new Connection(
    clusterApiUrl("devnet"),
    "confirmed"
  ),
};

export const commonConfig = EnvConfig.parse(process.env);
export const rpcConfig = RPCConfig.parse({
  ...process.env,
  ...solanaRPCs
});
export const accountEVM: HDAccount = mnemonicToAccount(commonConfig.MNEMONIC);
export const accountSolana: Keypair = getSolanaAccount(commonConfig.MNEMONIC);

export const config: EnvConfig & {
  rpcConfig: RPCConfig;
  accountEVM: HDAccount;
  accountSolana: Keypair;
} = {
  ...commonConfig,
  rpcConfig,
  accountEVM,
  accountSolana,
};

export default config;
