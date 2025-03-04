import { Keypair } from "@solana/web3.js";
import { HDKey } from "micro-key-producer/slip10.js";
import * as bip39 from "bip39";

export function getSolanaAccount(mnemonic: string) {
  const path = `m/44'/501'/0'/0'`;
  const seed = bip39.mnemonicToSeedSync(mnemonic, "");
  const hd = HDKey.fromMasterSeed(seed.toString("hex"));
  const keypair = Keypair.fromSeed(hd.derive(path).privateKey);
  return keypair;
}