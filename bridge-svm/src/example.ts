import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BorshCoder, EventParser, Program, setProvider, } from "@coral-xyz/anchor";
import type { MultisigNonce } from "./idl/idlType";
import idl from "./idl/idl.json";
import { getBridgeAccounts, getOrCreateUserATA, hexToUint8Array } from "./sdk/utils";
import { createMint, mintTo } from "@solana/spl-token";
import { Buffer } from "buffer";
import { receiveSigners, sendSigner } from "./backend/signs";
import { keccak_256 } from "@noble/hashes/sha3";
import NodeWallet from "@coral-xyz/anchor/dist/esm/nodewallet";
import { send } from "./sdk/send";


const adminKeypair = hexToUint8Array("5d643dcec205c32cdece36e8bd01861761735357ab6118785cbd17ca4f221e6cb9c5173af99f8f1b5bc5eddf7cca5dcabf2d1e099e7aa553cf3b7ca81ff7f801");
// keypair need only for deploying, not for using
const tokenKeypair = hexToUint8Array("d6fd15319478d970ed7254f2075bd04f7b1a70d689e2b29982d9c7545cbc3a170ecf7e3de1d95308e73d44fa93dc125a747465033e19ec2694b05c2e56f74493")


const admin = Keypair.fromSecretKey( adminKeypair)
const token = Keypair.fromSecretKey(tokenKeypair)

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const provider = new AnchorProvider(connection, new NodeWallet(admin), {});
setProvider(provider);
export const program = new Program(idl as MultisigNonce, provider);


export async function main() {

  // console.log(admin.publicKey.toBase58())
  // await createToken();
  // await initialize();

  const txSignature = await send(connection,
    token.publicKey, "0x7abd986995753C186a8e22cd7be89Efe9Ade9C0d",
    admin, "0x1111472FCa4260505EcE4AcD07717CADa41c1111",
    program, 1488, undefined
  );

  const txParsed = await connection.getParsedTransaction(txSignature, { commitment: 'confirmed' });
  console.log(txParsed)

  const eventParser = new EventParser(program.programId, new BorshCoder(program.idl));
  const events = eventParser.parseLogs(txParsed.meta.logMessages);
  for (let event of events) {
    console.log(event);
  }

}

async function createToken() {
  const tokenMint1 = token;
  await createMint(connection, admin, admin.publicKey, admin.publicKey, 6, tokenMint1);
  const user_token1_ata = (await getOrCreateUserATA(connection, admin, tokenMint1.publicKey)).address;
  await mintTo(connection, admin, tokenMint1.publicKey, user_token1_ata, admin, 1000 * 10 ** 6);

}

async function initialize() {

  // initialize global state
  const receiveSignersBuffer = Buffer.alloc(32 * receiveSigners.length);
  receiveSigners.forEach((signer, i) => receiveSignersBuffer.set(signer.publicKey.toBuffer(), i * 32));
  const receiveSigner = new anchor.web3.PublicKey(keccak_256(receiveSignersBuffer));

  await program.methods.initialize(sendSigner.publicKey, receiveSigner).accounts({
    admin: admin.publicKey,
  }).signers([admin]).rpc();


  // initialize token
  const ambTokenAddress = hexToUint8Array("0x7abd986995753C186a8e22cd7be89Efe9Ade9C0d");
  await program.methods.initializeToken([...ambTokenAddress]).accounts({
    signer: admin.publicKey,
    ...getBridgeAccounts(token.publicKey, program.programId),
  }).signers([admin]).rpc();

}


main();

