import { config as dotenvConfig } from "dotenv";
import { type HDAccount, mnemonicToAccount } from "viem/accounts";
import { getSolanaAccount } from "../solana/getAccount";
import { EnvConfig, RPCConfig } from "./configValidators";
import { type Keypair } from "@solana/web3.js";
dotenvConfig();

export const commonConfig = EnvConfig.parse(process.env);
export const rpcConfig = RPCConfig.parse(process.env);
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
