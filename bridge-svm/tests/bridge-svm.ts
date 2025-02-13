import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Ed25519Program,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';

import { MultisigNonce } from "../target/types/multisig_nonce";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import * as borsh from 'borsh';
import nacl from "tweetnacl";

import assert from "assert";
import { Buffer } from "buffer";
import {
  hexToUint8Array,
  newEd25519Instruction,
  ReceivePayload,
  SendPayload,
  serializeReceivePayload,
  serializeSendPayload
} from "./utils";
import { keccak_256 } from '@noble/hashes/sha3';

describe("my-project", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.local());

  const program = anchor.workspace.MultisigNonce as Program<MultisigNonce>;
  const connection = program.provider.connection;

  const admin = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();

  // pda - account to store some data
  // ata - associated token account - storing tokens (one per user per token)
  // mint - a.k.a. token


  let tokenMint1;         // some token
  let user_token1_ata;    // ata that store user's tokens, created by user
  let bridge_token1_pda;  // pda that store token config, created and owned by program (payed by admin)
  let bridge_token1_ata;  // ata that store locked token, owner is bridge_token1_pda (program)

  let state_pda;          // pda that store global state, created and owned by program (payed by admin)


  it("airdropping sol", async () => {

    console.log("Admin's wallet address is : ", admin.publicKey.toBase58())
    console.log("User's wallet address is : ", user.publicKey.toBase58())

    await requestSol(admin, connection);
    await requestSol(user, connection);


  })


  it("initializing", async () => {

    tokenMint1 = Keypair.generate();
    console.log("tokenMint1", tokenMint1.publicKey.toBase58())

    console.log("create mint 1")
    await createMint(connection, admin, admin.publicKey, admin.publicKey, 6, tokenMint1);

    console.log("create user pda 1")
    user_token1_ata = (await getOrCreateAssociatedTokenAccount(connection, user, tokenMint1.publicKey, user.publicKey)).address;

    console.log("mint to user pda 1")
    await mintTo(connection, user, tokenMint1.publicKey, user_token1_ata, admin, 10 * 10 ** 6);


    [bridge_token1_pda] = PublicKey.findProgramAddressSync([Buffer.from("token"), tokenMint1.publicKey.toBuffer()], program.programId)
    bridge_token1_ata = getAssociatedTokenAddressSync(tokenMint1.publicKey, bridge_token1_pda, true);

    [state_pda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], program.programId);


    console.log("user_token1_ata", user_token1_ata.toBase58())
    console.log("bridge_token1_pda", bridge_token1_pda.toBase58())
    console.log("bridge_token1_ata", bridge_token1_ata.toBase58())
    console.log("state_pda", state_pda.toBase58())


    await program.methods.initialize().accounts({
      state: state_pda,
      admin: admin.publicKey,
      systemProgram: SystemProgram.programId
    }).signers([admin]).rpc();


    const globalState = await program.account.globalState.fetch(state_pda);
    console.log("globalState", globalState)
    assert.ok(globalState.admin.equals(admin.publicKey));
    assert.ok(!globalState.pause);


    const ambTokenAddress = hexToUint8Array("0x1111472FCa4260505EcE4AcD07717CADa41c1111");
    await program.methods.initializeToken(ambTokenAddress).accounts({
      signer: admin.publicKey,
      bridgeToken: bridge_token1_pda,
      bridgeTokenAccount: bridge_token1_ata,
      mint: tokenMint1.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associated_token_program: ASSOCIATED_PROGRAM_ID,
      system_program: SystemProgram.programId,
    }).signers([admin]).rpc();


    const tokenConfigState = await program.account.tokenConfig.fetch(bridge_token1_pda);
    const tokenBalanceB = await connection.getTokenAccountBalance(bridge_token1_ata);
    const bridgeAta = await connection.getAccountInfo(bridge_token1_ata);

    console.log("tokenConfigState", tokenConfigState)
    console.log("tokenBalanceB", tokenBalanceB)
    console.log("bridgeAta", bridgeAta)

  });

  it('lock', async () => {
    const tokenBalanceUser = await connection.getTokenAccountBalance(user_token1_ata);
    const tokenBalanceBridge = await connection.getTokenAccountBalance(bridge_token1_ata);
    console.log("tokenBalanceUser", tokenBalanceUser)
    console.log("tokenBalanceBridge", tokenBalanceBridge)



    const ambTokenAddress = hexToUint8Array("0x1111472FCa4260505EcE4AcD07717CADa41c1111");
    const receiverAddress = hexToUint8Array("0x1111472FCa4260505EcE4AcD07717CADa41c1111");

    const value: SendPayload = {
      tokenAddress: tokenMint1.publicKey.toBytes(),
      tokenAddressTo: ambTokenAddress,
      amountToSend: 50,
      feeAmount: 20,
      chainFrom: 0x736F6C616E61,
      timestamp: Date.now(),
      flags: new Uint8Array(32),
      flagData: new Uint8Array(0),
    };
    const encoded = serializeSendPayload(value);
    const message = keccak_256(encoded)
    const signature = nacl.sign.detached(message, admin.secretKey);


    const verifyInstruction = newEd25519Instruction(1, message, [admin.publicKey.toBytes()], [signature]);

    // Lock tokens
    const sendInstruction = await program.methods.lock(encoded, receiverAddress).accounts({
      state: state_pda,
      sender: user.publicKey,
      sender_token_account: user_token1_ata,
      bridgeToken: bridge_token1_pda,
      bridgeTokenAccount: bridge_token1_ata,
      mint: tokenMint1.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      system_program: SystemProgram.programId,
    }).signers([user]).instruction();



    const tx = new Transaction().add(verifyInstruction, sendInstruction);
    tx.feePayer = user.publicKey;
    const txSignature = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' }); // wait for transaction to be confirmed


    const accountState = await program.account.globalState.fetch(state_pda);
    assert.ok(+accountState.nonce === 1);

    const tokenBalance2 = await connection.getTokenAccountBalance(user_token1_ata);
    console.log(tokenBalance2)

  });

  it('unlock', async () => {
    const tokenBalanceUser = await connection.getTokenAccountBalance(user_token1_ata);
    const tokenBalanceBridge = await connection.getTokenAccountBalance(bridge_token1_ata);
    console.log("tokenBalanceUser", tokenBalanceUser)
    console.log("tokenBalanceBridge", tokenBalanceBridge)

    const [nonceAccount] = PublicKey.findProgramAddressSync([Buffer.from("nonce"), user.publicKey.toBuffer()], program.programId);
    console.log("nonceAccount", nonceAccount.toBase58());



    const value: ReceivePayload = {
      to: user.publicKey.toBytes(),
      tokenAddressTo: tokenMint1.publicKey.toBytes(),
      amountTo: 50,
      chainTo: 0x736F6C616E61,
      flags: new Uint8Array(32),
      flagData: new Uint8Array(0),
      nonce: 0,
    };
    const encoded = serializeReceivePayload(value);
    const message = keccak_256(encoded)
    const signature = nacl.sign.detached(message, admin.secretKey);


    const verifyInstruction = newEd25519Instruction(1, message, [admin.publicKey.toBytes()], [signature]);


    const receiveInstruction = await program.methods.unlock(encoded).accounts({
      state: state_pda,
      receiver: user.publicKey,
      receiver_token_account: user_token1_ata,
      receiverNonceAccount: nonceAccount,
      bridgeToken: bridge_token1_pda,
      bridgeTokenAccount: bridge_token1_ata,
      mint: tokenMint1.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      system_program: SystemProgram.programId,
    }).signers([user]).instruction()

    const tx = new Transaction().add(verifyInstruction, receiveInstruction);
    tx.feePayer = user.publicKey;
    const txSignature = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' }); // wait for transaction to be confirmed
    // const txStatus = await connection.getParsedTransaction(txSignature, 'confirmed');


    const receiverNonce = await program.account.nonceAccount.fetch(nonceAccount);
    assert.ok(+receiverNonce.nonceCounter === 1);
  });

});


async function requestSol(account, connection, amount = 5) {
  console.log(`Requesting airdrop for SOL : ${account.publicKey.toBase58()}`)
  const signature = await connection.requestAirdrop(account.publicKey, amount * 10 ** 9);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
  console.log("account wallet balance : ", account.publicKey.toBase58(), (await connection.getBalance(account.publicKey)) / 10 ** 9, "SOL")
}
