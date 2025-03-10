import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  AnchorProvider,
  BorshCoder,
  EventParser,
  Program,
  setProvider,
} from "@coral-xyz/anchor";
import type { AmbSolBridge } from "./idl/idlType";
import idl from "./idl/idl.json";
import { send } from "./sdk/send";

import {
  getBridgeTokenAccounts,
  getOrCreateUserATA,
  initializeToken,
} from "./sdk/utils";
import { createMint, mintTo, NATIVE_MINT } from "@solana/spl-token";
import { Buffer } from "buffer";
import { backendMock, receiveSigners, sendSigner } from "./backend/signs";
import { keccak_256 } from "@noble/hashes/sha3";
import NodeWallet from "@coral-xyz/anchor/dist/esm/nodewallet";
import { receive } from "./sdk/receive";

const admin = Keypair.fromSecretKey(
  new Uint8Array([
    93, 100, 61, 206, 194, 5, 195, 44, 222, 206, 54, 232, 189, 1, 134, 23, 97,
    115, 83, 87, 171, 97, 24, 120, 92, 189, 23, 202, 79, 34, 30, 108, 185, 197,
    23, 58, 249, 159, 143, 27, 91, 197, 237, 223, 124, 202, 93, 202, 191, 45,
    30, 9, 158, 122, 165, 83, 207, 59, 124, 168, 31, 247, 248, 1,
  ])
);

// keypair need only for deploying, not for using
const sambKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    83, 147, 2, 142, 124, 9, 120, 10, 166, 163, 47, 187, 129, 120, 148, 140,
    133, 192, 196, 205, 147, 206, 101, 158, 241, 3, 54, 166, 58, 158, 128, 101,
    12, 245, 57, 17, 200, 6, 204, 255, 235, 106, 44, 247, 84, 165, 236, 37, 184,
    127, 122, 115, 60, 243, 117, 169, 12, 229, 250, 172, 159, 207, 76, 91,
  ])
);
const usdcKeypair = Keypair.fromSecretKey(
  new Uint8Array([
    250, 118, 92, 141, 112, 40, 17, 71, 123, 162, 41, 47, 184, 52, 167, 6, 188,
    213, 63, 125, 17, 105, 73, 40, 14, 238, 177, 151, 115, 174, 250, 186, 13,
    139, 115, 106, 223, 91, 60, 173, 12, 148, 110, 43, 72, 209, 132, 178, 153,
    252, 178, 94, 208, 158, 181, 91, 68, 75, 153, 40, 79, 227, 245, 161,
  ])
);

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const wallet = new NodeWallet(admin);
const provider = new AnchorProvider(connection, wallet, {
  commitment: "processed",
});
setProvider(provider);

export const program = new Program(idl as AmbSolBridge, provider);

export async function main() {
  // await initialize();
  // await createToken(sambKeypair, true);
  // await createToken(usdcKeypair);
  const sambAmb = "0x2Cf845b49e1c4E5D657fbBF36E97B7B5B7B7b74b";
  const wsolAmb = "0xC6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7";
  const usdcAmb = "0x8132928B8F4c0d278cc849b9b98Dffb28aE0B685";
  // await initializeToken(
  //   program,
  //   admin,
  //   sambKeypair.publicKey,
  //   sambAmb,
  //   18,
  //   true
  // );
  // await initializeToken(program, admin, NATIVE_MINT, wsolAmb, 18, false);
  // await initializeToken(
  //   program,
  //   admin,
  //   usdcKeypair.publicKey,
  //   usdcAmb,
  //   18,
  //   false
  // );

  // await makeSendTx(usdcKeypair.publicKey, usdcAmb);
  await makeReceiveTx();
}

async function createToken(tokenKeypair: Keypair, isSynthetic = false) {
  if (isSynthetic) {
    // mint authority should be bridge token PDA for synthetic tokens
    const [bridgeTokenPDA] = getBridgeTokenAccounts(
      tokenKeypair.publicKey,
      program.programId
    );
    await createMint(
      connection,
      admin,
      bridgeTokenPDA,
      admin.publicKey,
      6,
      tokenKeypair
    );
  } else {
    await createMint(
      connection,
      admin,
      admin.publicKey,
      admin.publicKey,
      6,
      tokenKeypair
    );
    // also mint some tokens to user
    const userATA = await getOrCreateUserATA(
      connection,
      admin,
      tokenKeypair.publicKey
    );
    await mintTo(
      connection,
      admin,
      tokenKeypair.publicKey,
      userATA,
      admin,
      1000000 * 10 ** 6
    );
  }
}

async function initialize() {
  // initialize global state
  const receiveSignersBuffer = Buffer.alloc(32 * receiveSigners.length);
  receiveSigners.forEach((signer, i) =>
    receiveSignersBuffer.set(signer.publicKey.toBuffer(), i * 32)
  );
  const receiveSigner = new PublicKey(keccak_256(receiveSignersBuffer));

  await program.methods
    .initialize(sendSigner.publicKey, receiveSigner)
    .accounts({
      admin: admin.publicKey,
    })
    .signers([admin])
    .rpc();
}

async function makeReceiveTx() {
  const { payload, signature } = await backendMock.getReceivePayload(
    admin.publicKey,
    usdcKeypair.publicKey,
    228_000000,
    32,
    1
  );
  const txSignature = await receive(
    connection,
    admin,
    program,
    payload,
    signature
  );

  const txParsed = await connection.getParsedTransaction(txSignature, {
    commitment: "confirmed",
  });
  console.log(txParsed);

  const eventParser = new EventParser(
    program.programId,
    new BorshCoder(program.idl)
  );
  const events = eventParser.parseLogs(txParsed.meta.logMessages);
  for (let event of events) {
    console.log(event);
  }
}

async function makeSendTx(tokenFrom: PublicKey, tokenTo: string) {
  const txSignature = await send(
    connection,
    tokenFrom,
    tokenTo,
    admin,
    "0x1111472FCa4260505EcE4AcD07717CADa41c1111",
    program,
    1488_000000,
    undefined,
    backendMock
  );

  const txParsed = await connection.getParsedTransaction(txSignature, {
    commitment: "confirmed",
  });
  console.log(txParsed);

  const eventParser = new EventParser(
    program.programId,
    new BorshCoder(program.idl)
  );
  const events = eventParser.parseLogs(txParsed.meta.logMessages);
  for (let event of events) {
    console.log(event);
  }
}

main();
