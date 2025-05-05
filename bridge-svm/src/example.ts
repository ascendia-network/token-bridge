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
  getBridgeStateAccount,
  getBridgeTokenAccounts,
  getOrCreateUserATA,
  getUserNoncePda, initializeToken,
} from "./sdk/utils";
import { createMint, mintTo, NATIVE_MINT } from "@solana/spl-token";
import { Buffer } from "buffer";
import { backendMock, receiveSigner, receiveSigners, sendSigner } from "./backend/signs";
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

/**
 * Serves as the main entry point for demonstrating blockchain token operations.
 *
 * This asynchronous function demonstrates various Solana token operations, including token initialization and transaction processing.
 * While several operations (e.g., token creation and state initialization) are provided as commented examples, the current implementation
 * executes a token receive transaction by calling {@link makeReceiveTx}. Uncomment additional operations as needed for testing.
 *
 * @example
 * // Execute the main function to perform a receive transaction.
 * await main();
 */
export async function main() {
  // await initialize()

  // await createToken(sambKeypair, true);
  // await createToken(usdcKeypair);

  console.log(sambKeypair.publicKey.toBase58());
  const sambAmb = "0x8D3e03889bFCb859B2dBEB65C60a52Ad9523512c";
  const wsolAmb = "0x56Fd3B5C152750772bE0c24aAd3C66f7d386e0b7";
  const usdcAmb = "0xc251fce04dE83A95119009F4a0B851843206486e";

  // await initializeToken(program, admin, sambKeypair.publicKey, sambAmb, 18, true);
  // await initializeToken(program, admin, NATIVE_MINT, wsolAmb, 18, false);
  // await initializeToken(program, admin, usdcKeypair.publicKey, usdcAmb, 18, false);
  //
  //
  console.log("sendSigner", sendSigner.publicKey.toBase58());
  console.log("receiveSigner", receiveSigner.toString());
  const globalState = await program.account.globalState.fetch(getBridgeStateAccount(program.programId));
  console.log(globalState);

  // await setSigners(sendSigner.publicKey, receiveSigner);
  // await makeSendTx(usdcKeypair.publicKey, usdcAmb);
  // await makeReceiveTx();
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


/**
 * Creates a new token mint.
 *
 * For synthetic tokens, the mint authority is set to a bridge token PDA derived from the provided token's public key. For standard tokens, the admin's public key is used as the mint authority and an initial supply of 1,000,000 tokens (with 6 decimals) is minted to the user's associated token account.
 *
 * @param tokenKeypair - The keypair representing the token mint to be created.
 * @param isSynthetic - Optional flag indicating if the token should be synthetic (default is false).
 */
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

/**
 * Initializes the global state of the program.
 *
 * This asynchronous function aggregates the public keys of all configured receive signers by encoding each into a fixed-length buffer,
 * then computes the keccak256 hash of the concatenated buffer to derive a unique receive signer public key.
 * It subsequently invokes the program's initialize method using the send signer's public key and the derived receive signer,
 * setting the admin's public key as the admin account for the transaction.
 *
 * @remark The derived receive signer is obtained by splitting the buffer into 32-byte segments for each signer's public key before hashing.
 */
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

/**
 * Sends tokens from a source account to a destination account and logs the transaction details along with parsed events.
 *
 * This asynchronous function initiates a token transfer by calling a send method with predefined parameters,
 * including an admin wallet, a smart contract program, and a backend mock service. After submitting the transaction,
 * it retrieves the parsed transaction data with a confirmed commitment status and logs both the overall transaction details
 * and each event parsed from the transaction logs.
 *
 * @param tokenFrom - The public key of the token account from which tokens are sent.
 * @param tokenTo - The identifier of the destination token account.
 */
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

/**
 * Executes a receive transaction by fetching the expected nonce, obtaining a signed payload,
 * and processing the transaction on the Solana blockchain.
 *
 * The function retrieves the current nonce from the blockchain state, then requests a receive
 * payload and signature from a backend service. It submits the receive transaction and logs both the
 * parsed transaction details and any events emitted during execution.
 *
 * @example
 * await makeReceiveTx();
 */
async function makeReceiveTx() {
  const expectedNonce = +(
    await program.account.nonceAccount.fetch(
      getUserNoncePda(admin.publicKey, program.programId)
    )
  ).nonceCounter;

  const { payload, signature } = await backendMock.getReceivePayload(
    admin.publicKey,
    usdcKeypair.publicKey,
    228_000000,
    expectedNonce,
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

main();
