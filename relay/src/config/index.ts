import { config as dotenvConfig } from "dotenv";
import { mnemonicToAccount } from "viem/accounts";
import { getSolanaAccount } from "../solana/getAccount";
import { EnvConfig, RPCConfig } from "./configValidators";
dotenvConfig();

export const commonConfig = EnvConfig.parse(process.env);
export const rpcConfig = RPCConfig.parse(process.env);
export const accountEVM = mnemonicToAccount(commonConfig.MNEMONIC);
export const accountSolana = getSolanaAccount(commonConfig.MNEMONIC);

export const config = {
  ...commonConfig,
  rpcConfig,
  accountEVM,
  accountSolana,
};

export type Config = typeof config;

export default config;
