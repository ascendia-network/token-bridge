import * as anchor from "@coral-xyz/anchor";
import { BorshCoder, EventParser, Program } from "@coral-xyz/anchor";
import { Keypair, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';

import { MultisigNonce } from "../../target/types/multisig_nonce";
import { createMint, mintTo } from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

import assert from "assert";
import { Buffer } from "buffer";
import { keccak_256 } from '@noble/hashes/sha3';
import { receiveSigners, sendSigner, signMessage } from "../../src/backend/signs";
import {
  getBridgeAccounts,
  getBridgeStateAccount,
  getBridgeTokenAccounts,
  getOrCreateUserATA,
  getUserNoncePda,
  hexToUint8Array
} from "../../src/sdk/utils";
import { ReceivePayload, SendPayload, serializeReceivePayload, serializeSendPayload } from "../../src/backend/types";
import { newEd25519Instruction } from "../../src/sdk/ed25519_ix";

describe("my-project", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.local());

  const program = anchor.workspace.MultisigNonce as Program<MultisigNonce>;
  const bridgeProgram = program;
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

    // create some token
    tokenMint1 = Keypair.generate();
    console.log("tokenMint1", tokenMint1.publicKey.toBase58())

    console.log("create mint 1")
    await createMint(connection, admin, admin.publicKey, admin.publicKey, 6, tokenMint1);

    console.log("create user pda 1")
    user_token1_ata = (await getOrCreateUserATA(connection, user, tokenMint1.publicKey)).address;

    console.log("mint to user pda 1")
    await mintTo(connection, user, tokenMint1.publicKey, user_token1_ata, admin, 10 * 10 ** 6);


    // initialize global state
    [bridge_token1_pda, bridge_token1_ata] = getBridgeTokenAccounts(tokenMint1.publicKey, program.programId)
    state_pda = getBridgeStateAccount(program.programId);

    const receiveSignersBuffer = Buffer.alloc(32 * receiveSigners.length);
    receiveSigners.forEach((signer, i) => receiveSignersBuffer.set(signer.publicKey.toBuffer(), i * 32));
    const receiveSigner = new anchor.web3.PublicKey(keccak_256(receiveSignersBuffer));
    console.log("receiveSigner", receiveSigner.toBytes())

    console.log("user_token1_ata", user_token1_ata.toBase58())
    console.log("bridge_token1_pda", bridge_token1_pda.toBase58())
    console.log("bridge_token1_ata", bridge_token1_ata.toBase58())
    console.log("state_pda", state_pda.toBase58())


    await program.methods.initialize(sendSigner.publicKey, receiveSigner).accounts({
      state: state_pda,
      admin: admin.publicKey,
      systemProgram: SystemProgram.programId
    }).signers([admin]).rpc();


    const globalState = await program.account.globalState.fetch(state_pda);
    console.log("globalState", globalState)
    assert.ok(globalState.admin.equals(admin.publicKey));
    assert.ok(!globalState.pause);


    // initialize token
    const ambTokenAddress = hexToUint8Array("0x1111472FCa4260505EcE4AcD07717CADa41c1111");
    await program.methods.initializeToken(ambTokenAddress).accounts({
      signer: admin.publicKey,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      ...getBridgeAccounts(tokenMint1.publicKey, program.programId),
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

    const userFrom = user;
    const tokenFrom = tokenMint1.publicKey;
    const userTo = hexToUint8Array("0x1111472FCa4260505EcE4AcD07717CADa41c1111");
    const tokenTo = hexToUint8Array("0x1111472FCa4260505EcE4AcD07717CADa41c1111");




    const value: SendPayload = {
      tokenAddressFrom: tokenFrom.toBytes(),
      tokenAddressTo: tokenTo,
      amountToSend: 50,
      feeAmount: 20,
      chainFrom: 0x736F6C616E61,
      timestamp: Date.now(),
      flags: new Uint8Array(32),
      flagData: new Uint8Array(0),
    };


    const user_token_ata = (await getOrCreateUserATA(connection, userFrom, tokenFrom)).address;
    const payload = serializeSendPayload(value);
    const { message, signers, signatures } = signMessage(payload, [sendSigner]);

    const verifyInstruction = newEd25519Instruction(message, signers, signatures);
    // Lock tokens
    const sendInstruction = await bridgeProgram.methods.lock(payload, userTo).accounts({
      sender: user.publicKey,
      senderTokenAccount: user_token_ata,
      ...getBridgeAccounts(tokenFrom, bridgeProgram.programId),
    }).signers([userFrom]).instruction();

    const tx = new Transaction().add(verifyInstruction, sendInstruction);
    tx.feePayer = userFrom.publicKey;
    const txSignature = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' }); // wait for transaction to be confirmed


    const txParsed = await connection.getParsedTransaction(txSignature, { commitment: 'confirmed' });
    console.log(txParsed)

    const eventParser = new EventParser(program.programId, new BorshCoder(program.idl));
    const events = eventParser.parseLogs(txParsed.meta.logMessages);
    for (let event of events) {
      console.log(event);
    }


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



    const token = tokenMint1.publicKey;




    const value: ReceivePayload = {
      to: user.publicKey.toBytes(),
      tokenAddressTo: token.toBytes(),
      amountTo: 50,
      chainTo: 0x736F6C616E61,
      flags: new Uint8Array(32),
      flagData: new Uint8Array(0),
      nonce: 0,
    };


    const user_token_ata = (await getOrCreateUserATA(connection, user, token)).address;
    const nonceAccount = getUserNoncePda(user.publicKey, bridgeProgram.programId);


    const payload = serializeReceivePayload(value);
    const {message, signers, signatures} = signMessage(payload, receiveSigners);
    const verifyInstruction = newEd25519Instruction(message, signers, signatures);

    const receiveInstruction = await bridgeProgram.methods.unlock(payload).accounts({
      receiver: user.publicKey,
      receiverTokenAccount: user_token_ata,
      receiverNonceAccount: nonceAccount,
      ...getBridgeAccounts(token, bridgeProgram.programId),
    }).signers([user]).instruction()

    const tx = new Transaction().add(verifyInstruction, receiveInstruction);
    tx.feePayer = user.publicKey;
    const txSignature = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' }); // wait for transaction to be confirmed





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
