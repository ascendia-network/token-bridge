import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, setProvider, } from "@coral-xyz/anchor";
import type { AmbSolBridge } from "./idl/idlType";
import idl from "./idl/idl.json";

import { getBridgeStateAccount, initializeToken, } from "./sdk/utils";
import { Buffer } from "buffer";
import { keccak_256 } from "@noble/hashes/sha3";
import NodeWallet from "@coral-xyz/anchor/dist/esm/nodewallet";
import { NATIVE_MINT } from "@solana/spl-token";


const adminKeypairPK = []
const admin = Keypair.fromSecretKey(new Uint8Array(adminKeypairPK));


const receiveSigners = [
  new PublicKey("p6TKDQs2jPDiTERL7GkdvjG3AfRSs6DR5ajeEXbTXup"), // Andrii m
  new PublicKey("6BegtaF1aEi2cZNozDsCipLDMJZofUtKCz7DWu2zHcgd"), // rwxrxrx
  new PublicKey("F7tGeffguqexTiVhai2Y9aGWeYuVLk1cuM8YcAU471g6"), // valar999
  new PublicKey("5Ffq8JcieVCf5LBzgkv6airLpJ1GoTFFYfN4e7HDfWkk"), // kuroneko
  new PublicKey("8aW9wCS6nCRSHR7k3XkYk9uAcseywc6cH7N6hwL6eVsZ"), // Andrii R
]
const sendSigner = new PublicKey("FMYR5BFh3JapZS1cfwYViiBMYJxFGwKdchnghBnBtxkk");  // svin

const receiveSignersBuffer = Buffer.alloc(32 * receiveSigners.length);
receiveSigners.forEach((signer, i) => receiveSignersBuffer.set(signer.toBuffer(), i * 32));
const receiveSigner = new PublicKey(keccak_256(receiveSignersBuffer));


const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
const wallet = new NodeWallet(admin);
const provider = new AnchorProvider(connection, wallet, { commitment: "processed", });
setProvider(provider);

export const program = new Program(idl as AmbSolBridge, provider);


export async function main() {
  // await initialize(sendSigner, receiveSigner);


  const sambAmb = "0x2b2d892C3fe2b4113dd7aC0D2c1882AF202FB28F";
  const wsolAmb = "0x15c59080a8a39eee0d1429Ab30a923BC210258BD";
  const usdcAmb = "0xFF9F502976E7bD2b4901aD7Dd1131Bb81E5567de";

  const sambSol = new PublicKey("SAMBiNFocuZgLqkGHZbe2u6gugF861MdMkgrDdiuEpW");
  const usdcSol = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  // await initializeToken(program, admin, sambSol, sambAmb, 18, true);
  // await initializeToken(program, admin, NATIVE_MINT, wsolAmb, 18, false);
  // await initializeToken(program, admin, usdcSol, usdcAmb, 18, false);
  
}


async function setSigners(sendSigner: PublicKey, receiveSigner: PublicKey) {
  await program.methods
    .setSigners(sendSigner, receiveSigner)
    .accounts({
      admin: admin.publicKey,
    })
    .signers([admin])
    .rpc();
}


async function initialize(sendSigner: PublicKey, receiveSigner: PublicKey) {
  console.log("sendSigner", sendSigner.toBase58());
  console.log("receiveSigner", receiveSigner.toString());
  await program.methods.initialize(sendSigner, receiveSigner)
    .accounts({
      admin: admin.publicKey,
    })
    .signers([admin])
    .rpc();
}


main();
