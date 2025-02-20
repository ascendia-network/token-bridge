import { AnchorProvider, BorshCoder, EventParser, Program, setProvider, workspace } from "@coral-xyz/anchor";
import { Keypair, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';

import { AmbSolBridge } from "../../target/types/amb_sol_bridge";
import { createMint, createSyncNativeInstruction, mintTo, NATIVE_MINT } from "@solana/spl-token";

import assert from "assert";
import { receiveSigner, receiveSigners, sendSigner, signMessage } from "../../src/backend/signs";
import {
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
  setProvider(AnchorProvider.local());

  const program = workspace.AmbSolBridge as Program<AmbSolBridge>;
  const bridgeProgram = program;
  const connection = program.provider.connection;

  const admin = Keypair.generate();
  const user = Keypair.generate();

  // pda - account to store some data
  // ata - associated token account - storing tokens (one per user per token)
  // mint - a.k.a. token


  let tokenMint1;         // some token (bridge CAN'T mint)
  let tokenMint2;        // some token (bridge CAN mint)


  const ambTokenAddress1 = hexToUint8Array("0x0000000000000000000000000000000000001111");
  const ambTokenAddress2 = hexToUint8Array("0x0000000000000000000000000000000000002222");
  const ambTokenAddress3 = hexToUint8Array("0x0000000000000000000000000000000000003333");
  const ambUserAddress = hexToUint8Array("0x000000000000000000000000000000000000aaaa");


  it("airdropping sol", async () => {

    console.log("Admin's wallet address is : ", admin.publicKey.toBase58())
    console.log("User's wallet address is : ", user.publicKey.toBase58())

    await requestSol(admin, connection);
    await requestSol(user, connection);
  })


  it("initializing global state", async () => {
    await program.methods.initialize(sendSigner.publicKey, receiveSigner).accounts({ admin: admin.publicKey, }).signers([admin]).rpc();

    const state_pda = getBridgeStateAccount(program.programId);
    const globalState = await program.account.globalState.fetch(state_pda);
    console.log("globalState", globalState)
    assert.ok(globalState.admin.equals(admin.publicKey));
    assert.ok(!globalState.pause);

  });


  it("initializing tokens", async () => {
    [tokenMint1, tokenMint2] = [Keypair.generate(), Keypair.generate()];
    console.log("tokenMint1", tokenMint1.publicKey.toBase58())
    console.log("tokenMint2", tokenMint2.publicKey.toBase58())

    console.log("create tokens")
    await createMint(connection, admin, admin.publicKey, null, 6, tokenMint1);
    const [bridgeToken2PDA] = getBridgeTokenAccounts(tokenMint2.publicKey, program.programId);
    await createMint(connection, admin, bridgeToken2PDA, null, 6, tokenMint2);  // mint authority is token PDA

    console.log("bridgeToken2PDA", bridgeToken2PDA.toBase58())

    console.log("create user pdas")
    const user_token1_ata = await getOrCreateUserATA(connection, user, tokenMint1.publicKey);
    const user_token2_ata = await getOrCreateUserATA(connection, user, tokenMint2.publicKey);

    console.log("mint token1 to user pda")
    await mintTo(connection, user, tokenMint1.publicKey, user_token1_ata, admin, 10 * 10 ** 6);


    // initialize token 1
    await program.methods.initializeToken([...ambTokenAddress1], 18, false).accounts({
      admin: admin.publicKey,
      mint: tokenMint1.publicKey,
    }).signers([admin]).rpc();
    // initialize token 2
    await program.methods.initializeToken([...ambTokenAddress2], 18, true).accounts({
      admin: admin.publicKey,
      mint: tokenMint2.publicKey,
    }).signers([admin]).rpc();
    // initialize token 3
    await program.methods.initializeToken([...ambTokenAddress3], 18, false).accounts({
      admin: admin.publicKey,
      mint: NATIVE_MINT,
    }).signers([admin]).rpc();


    const [bridge_token1_pda, bridge_token1_ata] = getBridgeTokenAccounts(tokenMint1.publicKey, program.programId);
    const tokenConfigState = await program.account.tokenConfig.fetch(bridge_token1_pda);
    const tokenBalanceB = await connection.getTokenAccountBalance(bridge_token1_ata);
    const bridgeAta = await connection.getAccountInfo(bridge_token1_ata);

    console.log("tokenConfigState", tokenConfigState)
    console.log("tokenBalanceB", tokenBalanceB)
    console.log("bridgeAta", bridgeAta)

  });


  it('send non mintable token', async () => {


    const userFrom = user;
    const tokenFrom = tokenMint1.publicKey;
    const userTo = ambUserAddress;
    const tokenTo = ambTokenAddress1;


    const user_token_ata = await getOrCreateUserATA(connection, userFrom, tokenFrom);
    const [_, bridge_token_ata] = getBridgeTokenAccounts(tokenFrom, program.programId);

    const tokenBalanceUser = await connection.getTokenAccountBalance(user_token_ata);
    const tokenBalanceBridge = await connection.getTokenAccountBalance(bridge_token_ata);
    console.log("tokenBalanceUser", tokenBalanceUser)
    console.log("tokenBalanceBridge", tokenBalanceBridge)


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


    const payload = serializeSendPayload(value);
    const { message, signers, signatures } = signMessage(payload, [sendSigner]);

    const verifyInstruction = newEd25519Instruction(message, signers, signatures);
    // send tokens
    const sendInstruction = await bridgeProgram.methods.send(payload, [...userTo]).accounts({
      sender: userFrom.publicKey,
      mint: tokenFrom,
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


    const state_pda = getBridgeStateAccount(program.programId);
    const accountState = await program.account.globalState.fetch(state_pda);
    assert.ok(+accountState.nonce === 1);

    const tokenBalance2 = await connection.getTokenAccountBalance(user_token_ata);
    console.log(tokenBalance2)

  });


  it('receive non mintable token', async () => {

    const token = tokenMint1.publicKey;


    const [bridge_token1_pda, bridge_token_ata] = getBridgeTokenAccounts(token, program.programId);
    const user_token_ata = await getOrCreateUserATA(connection, user, token);

    const tokenBalanceUser = await connection.getTokenAccountBalance(user_token_ata);
    const tokenBalanceBridge = await connection.getTokenAccountBalance(bridge_token_ata);
    console.log("tokenBalanceUser", tokenBalanceUser)
    console.log("tokenBalanceBridge", tokenBalanceBridge)


    const value: ReceivePayload = {
      to: user.publicKey.toBytes(),
      tokenAddressTo: token.toBytes(),
      amountTo: 50,
      chainTo: 0x736F6C616E61,
      flags: new Uint8Array(32),
      flagData: new Uint8Array(0),
      nonce: 0,
    };


    const nonceAccount = getUserNoncePda(user.publicKey, bridgeProgram.programId);


    const payload = serializeReceivePayload(value);
    const { message, signers, signatures } = signMessage(payload, receiveSigners);
    const verifyInstruction = newEd25519Instruction(message, signers, signatures);

    const receiveInstruction = await bridgeProgram.methods.receive(payload).accounts({
      receiver: user.publicKey,
      mint: token,
    }).signers([user]).instruction()

    const tx = new Transaction().add(verifyInstruction, receiveInstruction);
    tx.feePayer = user.publicKey;
    const txSignature = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' }); // wait for transaction to be confirmed


    const receiverNonce = await program.account.nonceAccount.fetch(nonceAccount);
    assert.ok(+receiverNonce.nonceCounter === 1);
  });


  it('receive mintable token', async () => {

    const token = tokenMint2.publicKey;


    const [bridge_token1_pda, bridge_token_ata] = getBridgeTokenAccounts(token, program.programId);
    const user_token_ata = await getOrCreateUserATA(connection, user, token);

    const tokenBalanceUser = await connection.getTokenAccountBalance(user_token_ata);
    const tokenBalanceBridge = await connection.getTokenAccountBalance(bridge_token_ata);
    console.log("tokenBalanceUser", tokenBalanceUser)
    console.log("tokenBalanceBridge", tokenBalanceBridge)


    const value: ReceivePayload = {
      to: user.publicKey.toBytes(),
      tokenAddressTo: token.toBytes(),
      amountTo: 500,
      chainTo: 0x736F6C616E61,
      flags: new Uint8Array(32),
      flagData: new Uint8Array(0),
      nonce: 1,
    };


    const nonceAccount = getUserNoncePda(user.publicKey, bridgeProgram.programId);


    const payload = serializeReceivePayload(value);
    const { message, signers, signatures } = signMessage(payload, receiveSigners);
    const verifyInstruction = newEd25519Instruction(message, signers, signatures);

    const receiveInstruction = await bridgeProgram.methods.receive(payload).accounts({
      receiver: user.publicKey,
      mint: token,
    }).signers([user]).instruction()

    const tx = new Transaction().add(verifyInstruction, receiveInstruction);
    tx.feePayer = user.publicKey;
    const txSignature = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' }); // wait for transaction to be confirmed


    const receiverNonce = await program.account.nonceAccount.fetch(nonceAccount);
    assert.ok(+receiverNonce.nonceCounter === 2);

    const userBalance = await connection.getTokenAccountBalance(user_token_ata);
    console.log(userBalance)

  });


  it('send mintable token', async () => {


    const userFrom = user;
    const userTo = ambUserAddress;
    const tokenFrom = tokenMint2.publicKey;
    const tokenTo = ambTokenAddress2;


    const user_token_ata = await getOrCreateUserATA(connection, userFrom, tokenFrom);
    const [_, bridge_token_ata] = getBridgeTokenAccounts(tokenFrom, program.programId);

    const tokenBalanceUser = await connection.getTokenAccountBalance(user_token_ata);
    // const tokenBalanceBridge = await connection.getTokenAccountBalance(bridge_token_ata);
    console.log("tokenBalanceUser", tokenBalanceUser)
    // console.log("tokenBalanceBridge", tokenBalanceBridge)


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


    const payload = serializeSendPayload(value);
    const { message, signers, signatures } = signMessage(payload, [sendSigner]);

    const verifyInstruction = newEd25519Instruction(message, signers, signatures);
    // send tokens
    const sendInstruction = await bridgeProgram.methods.send(payload, [...userTo]).accountsPartial({
      sender: userFrom.publicKey,
      mint: tokenFrom,
      bridgeTokenAccount: null,
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


    const state_pda = getBridgeStateAccount(program.programId);
    const accountState = await program.account.globalState.fetch(state_pda);
    assert.ok(+accountState.nonce === 2);

    const tokenBalance2 = await connection.getTokenAccountBalance(user_token_ata);
    console.log(tokenBalance2)

  });


  it('send native', async () => {


    const userFrom = user;
    const tokenFrom = NATIVE_MINT;
    const userTo = ambUserAddress;
    const tokenTo = ambTokenAddress3;


    const user_token_ata = await getOrCreateUserATA(connection, userFrom, tokenFrom);
    const [_, bridge_token_ata] = getBridgeTokenAccounts(tokenFrom, program.programId);

    const ata_info = await connection.getAccountInfo(user_token_ata);
    console.log("ata_info", ata_info)

    const tokenBalanceUser = await connection.getTokenAccountBalance(user_token_ata);
    const tokenBalanceBridge = await connection.getTokenAccountBalance(bridge_token_ata);
    console.log("tokenBalanceUser", tokenBalanceUser)
    console.log("tokenBalanceBridge", tokenBalanceBridge)


    const value: SendPayload = {
      tokenAddressFrom: tokenFrom.toBytes(),
      tokenAddressTo: tokenTo,
      amountToSend: 5_000,
      feeAmount: 20,
      chainFrom: 0x736F6C616E61,
      timestamp: Date.now(),
      flags: new Uint8Array(32),
      flagData: new Uint8Array(0),
    };


    const payload = serializeSendPayload(value);
    const { message, signers, signatures } = signMessage(payload, [sendSigner]);


    const transferNativeInstructions = [
      SystemProgram.transfer({
        fromPubkey: userFrom.publicKey,
        toPubkey: user_token_ata,
        lamports: value.amountToSend,
      }),
      createSyncNativeInstruction(user_token_ata)  // update ata balance
    ];


    const verifyInstruction = newEd25519Instruction(message, signers, signatures);
    // send tokens
    const sendInstruction = await bridgeProgram.methods.send(payload, [...userTo]).accounts({
      sender: user.publicKey,
      mint: tokenFrom,
      userTokenAta: user_token_ata
    }).signers([userFrom]).instruction();

    const tx = new Transaction().add(
      verifyInstruction, // must be at zero index for the bridge program
      ...transferNativeInstructions,
      sendInstruction
    );
    tx.feePayer = userFrom.publicKey;
    const txSignature = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' }); // wait for transaction to be confirmed


    const txParsed = await connection.getParsedTransaction(txSignature, { commitment: 'confirmed' });
    console.log(txParsed)

    const eventParser = new EventParser(program.programId, new BorshCoder(program.idl));
    const events = eventParser.parseLogs(txParsed.meta.logMessages);
    for (let event of events) {
      console.log(event);
    }


    const state_pda = getBridgeStateAccount(program.programId);
    const accountState = await program.account.globalState.fetch(state_pda);
    assert.ok(+accountState.nonce === 3);

    const tokenBalance2 = await connection.getTokenAccountBalance(user_token_ata);
    console.log(tokenBalance2)

  });


  it('receive native', async () => {

    const token = NATIVE_MINT;


    const [bridge_token1_pda, bridge_token_ata] = getBridgeTokenAccounts(token, program.programId);
    const user_token_ata = await getOrCreateUserATA(connection, user, token);

    const tokenBalanceUser = await connection.getTokenAccountBalance(user_token_ata);
    const tokenBalanceBridge = await connection.getTokenAccountBalance(bridge_token_ata);
    console.log("tokenBalanceUser", tokenBalanceUser)
    console.log("tokenBalanceBridge", tokenBalanceBridge)


    const value: ReceivePayload = {
      to: user.publicKey.toBytes(),
      tokenAddressTo: token.toBytes(),
      amountTo: 50,
      chainTo: 0x736F6C616E61,
      flags: new Uint8Array(32),
      flagData: new Uint8Array(0),
      nonce: 2,
    };


    const nonceAccount = getUserNoncePda(user.publicKey, bridgeProgram.programId);


    const payload = serializeReceivePayload(value);
    const { message, signers, signatures } = signMessage(payload, receiveSigners);
    const verifyInstruction = newEd25519Instruction(message, signers, signatures);

    const receiveInstruction = await bridgeProgram.methods.receive(payload).accounts({
      receiver: user.publicKey,
      mint: token,
    }).signers([user]).instruction()

    const tx = new Transaction().add(verifyInstruction, receiveInstruction);
    tx.feePayer = user.publicKey;
    const txSignature = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' }); // wait for transaction to be confirmed


    const receiverNonce = await program.account.nonceAccount.fetch(nonceAccount);
    assert.ok(+receiverNonce.nonceCounter === 3);
  });


});


async function requestSol(account, connection, amount = 500) {
  console.log(`Requesting airdrop for SOL : ${account.publicKey.toBase58()}`)
  const signature = await connection.requestAirdrop(account.publicKey, amount * 10 ** 9);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
  console.log("account wallet balance : ", account.publicKey.toBase58(), (await connection.getBalance(account.publicKey)) / 10 ** 9, "SOL")
}
