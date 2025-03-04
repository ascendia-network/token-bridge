import { z } from "zod";

export const RPCValidator = z.string().url("Invalid RPC URL");
export const RPCConfig = z.record(
  z
    .string()
    .regex(/RPC_URL_[0-9]+/)
    .or(z.literal("RPC_URL_SOLANA")),
  RPCValidator
);
export const EnvConfig = z.object({
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

export type EnvConfig = z.infer<typeof EnvConfig>;
export type RPCConfig = z.infer<typeof RPCConfig>;
