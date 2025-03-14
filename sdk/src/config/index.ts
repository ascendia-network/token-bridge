import { config } from "dotenv";
config();
export * from "./rpcs";

export const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
