import * as dotenv from "dotenv";

dotenv.config();

export class Config {
  authorizationKey: string;
  databaseUrl: string;
  signatureCollection: string;
  storageHost: string;
  storagePort: number;
  signatureStorage: string;
  evmContractAddress: string;
  evmApiUrl: string;
  evmPrivateKey: string;
  constructor() {
    this.authorizationKey = process.env.AUTHORIZATION_KEY || "";
    this.databaseUrl = process.env.DATABASE_URL || "";
    this.signatureCollection = process.env.SIGNATURE_COLLECTION || "";
    this.storageHost = process.env.STORAGE_HOST || "";
    this.storagePort = Number(process.env.STORAGE_PORT) || 8080;
    this.signatureStorage = process.env.SIGNATURE_STORAGE || "";
    this.evmContractAddress = process.env.EVM_CONTRACT_ADDRESS || "";
    this.evmApiUrl = process.env.EVM_API_URL || "";
    this.evmPrivateKey = process.env.EVM_PRIVATE_KEY || "";
  }
}
