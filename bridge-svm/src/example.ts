import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BorshCoder, EventParser, Program, setProvider } from "@coral-xyz/anchor";
import type { AmbSolBridge } from "./idl/idlType";
import idl from "./idl/idl.json";
import { getBridgeTokenAccounts, getOrCreateUserATA, hexToUint8Array } from "./sdk/utils";
import { createMint, mintTo, NATIVE_MINT } from "@solana/spl-token";
import { Buffer } from "buffer";
import { receiveSigners, sendSigner } from "./backend/signs";
import { keccak_256 } from "@noble/hashes/sha3";
import { send } from "./sdk/send";
import NodeWallet from "@coral-xyz/anchor/dist/esm/nodewallet";

// keypair need only for deploying, not for using

import sambKey from "../samb9vCFCTEvoi3eWDErSCb5GvTq8Kgv6VKSqvt7pgi.json";
import usdcKey from "../usdc3xpQ18NLAumSUvadS62srrkxQWrvQHugk8Nv7MA.json";

const adminKeypair = hexToUint8Array("5d643dcec205c32cdece36e8bd01861761735357ab6118785cbd17ca4f221e6cb9c5173af99f8f1b5bc5eddf7cca5dcabf2d1e099e7aa553cf3b7ca81ff7f801");


const sambKeypair = Keypair.fromSecretKey(new Uint8Array(sambKey));
const usdcKeypair = Keypair.fromSecretKey(new Uint8Array(usdcKey));

const admin = Keypair.fromSecretKey( adminKeypair)


const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const wallet = new NodeWallet(admin);
const provider = new AnchorProvider(connection, wallet, {  commitment: "processed",});
setProvider(provider);

export const program = new Program(idl as AmbSolBridge, provider);


export async function main() {
  await initialize()

  await createToken(sambKeypair, true);
  await createToken(usdcKeypair);


  const sambAmb = "0x2Cf845b49e1c4E5D657fbBF36E97B7B5B7B7b74b";
  const wsolAmb = "0xC6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7";
  const usdcAmb = "0x8132928B8F4c0d278cc849b9b98Dffb28aE0B685";

  await initializeToken(sambKeypair.publicKey, sambAmb, 18, true);
  await initializeToken(NATIVE_MINT, wsolAmb, 18, false);
  await initializeToken(usdcKeypair.publicKey, usdcAmb, 18, false);


  await makeSendTx(usdcKeypair.publicKey, usdcAmb);
  // console.log(admin.publicKey.toBase58())

}

async function createToken(tokenKeypair: Keypair, isSynthetic=false) {
  if (isSynthetic) {
    // mint authority should be bridge token PDA for synthetic tokens
    const [bridgeTokenPDA] = getBridgeTokenAccounts(tokenKeypair.publicKey, program.programId);
    await createMint(connection, admin, bridgeTokenPDA, admin.publicKey, 6, tokenKeypair);

  } else {
    await createMint(connection, admin, admin.publicKey, admin.publicKey, 6, tokenKeypair);
    // also mint some tokens to user
    const user_token1_ata = await getOrCreateUserATA(connection, admin, tokenKeypair.publicKey);
    await mintTo(connection, admin, tokenKeypair.publicKey, user_token1_ata, admin, 1000000 * 10 ** 6);
  }

}

async function initialize() {
  // initialize global state
  const receiveSignersBuffer = Buffer.alloc(32 * receiveSigners.length);
  receiveSigners.forEach((signer, i) => receiveSignersBuffer.set(signer.publicKey.toBuffer(), i * 32));
  const receiveSigner = new PublicKey(keccak_256(receiveSignersBuffer));

  await program.methods.initialize(sendSigner.publicKey, receiveSigner).accounts({
    admin: admin.publicKey,
  }).signers([admin]).rpc();

}

async function initializeToken(tokenPublicKey: PublicKey, ambAddress: string, ambDecimals=18, isSynthetic=false) {
  // initialize token
  await program.methods.initializeToken([...hexToUint8Array(ambAddress)], ambDecimals, isSynthetic).accounts({
    // @ts-ignore
    admin: admin.publicKey,
    mint: tokenPublicKey,
    bridgeTokenAccount: isSynthetic ? null : undefined  // empty value (null) for synthetic, auto-resoluted for non-synthetic
  }).signers([admin]).rpc();
}

async function makeSendTx(tokenFrom: PublicKey, tokenTo: string) {
  const txSignature = await send(connection,
    tokenFrom, tokenTo,
    admin, "0x1111472FCa4260505EcE4AcD07717CADa41c1111",
    program, 1488_000000, undefined
  );

  const txParsed = await connection.getParsedTransaction(txSignature, { commitment: 'confirmed' });
  console.log(txParsed)

  const eventParser = new EventParser(program.programId, new BorshCoder(program.idl));
  const events = eventParser.parseLogs(txParsed.meta.logMessages);
  for (let event of events) {
    console.log(event);
  }

}


main();

