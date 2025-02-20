import { z } from "zod";
import { config as dotenvConfig } from "dotenv";
import { mnemonicToAccount } from "viem/accounts";
import { getSolanaAccount } from "./solana/getAccount";
dotenvConfig();
const RPCValidator = z.string().url("Invalid RPC URL");
const RPCConfig = z.record(
  z
    .string()
    .regex(/RPC_URL_[0-9]+/)
    .or(z.literal("RPC_URL_SOLANA")),
  RPCValidator
);
const EnvConfig = z.object({
  BACKEND_URL: z
    .string()
    .url("Invalid backend URL")
    .default("http://localhost:3000"),
  MNEMONIC: z.string().nonempty("Mnemonic is required").readonly(),
  POLLING_INTERVAL: z
    .number()
    .int("Polling interval must be an integer")
    .positive("Polling interval must be positive")
    .min(1000, "Polling interval must be at least 1000ms")
    .default(5000),
});

export const config = EnvConfig.parse(process.env);
export const rpcConfig = RPCConfig.parse(process.env);
export const accountEVM = mnemonicToAccount(config.MNEMONIC);
export const accountSolana = getSolanaAccount(config.MNEMONIC);
