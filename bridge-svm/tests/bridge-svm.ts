import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { type Connection, Keypair, PublicKey, type Signer, SystemProgram, Transaction } from '@solana/web3.js';

import { MultisigNonce } from "../target/types/multisig_nonce";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";


import assert from "assert";


describe("my-project", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.local());

  const program = anchor.workspace.MultisigNonce as Program<MultisigNonce>;

  let connection;
  let admin, user;
  let state, vault;
  let tokenMintA;
  let userTokenAddressA;

  it("airdropping sol", async () => {

    connection = program.provider.connection;

    admin = anchor.web3.Keypair.generate();
    user = anchor.web3.Keypair.generate();
    tokenMintA = Keypair.generate();

    [state] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], program.programId);

    console.log("Admin's wallet address is : ", admin.publicKey.toBase58())
    console.log("User's wallet address is : ", user.publicKey.toBase58())
    console.log("tokenMintA", tokenMintA.publicKey)

    await requestSol(admin, connection);
    await requestSol(user, connection);


    userTokenAddressA = await mintingTokens({
      connection,
      creator: admin,
      holder: user,
      tokenKeypair: tokenMintA,
    })
    console.log("userTokenAddressA", userTokenAddressA.address)

  })


  it("initializing", async () => {

    const tx = await program.methods.initialize().accounts({
      state: state,
      admin: admin.publicKey,
      systemProgram: SystemProgram.programId
    }).signers([admin]).rpc();
    console.log("Your transaction signature", tx);

    const accountState = await program.account.globalState.fetch(state);
    console.log("accountState", accountState)
    assert.ok(accountState.admin.equals(admin.publicKey));
    assert.ok(accountState.isEnable);


    const [bridge_token_pda] = PublicKey.findProgramAddressSync([Buffer.from("token"), tokenMintA.publicKey.toBuffer()], program.programId)
    const bridge_token_account = getAssociatedTokenAddressSync(tokenMintA.publicKey, bridge_token_pda, true);


    await program.methods.initializeToken(hexToUint8Array("0x1111472FCa4260505EcE4AcD07717CADa41c1111")).accounts({
      signer: admin.publicKey,
      bridge_token: bridge_token_pda,
      bridge_token_account: bridge_token_account,

      mint: tokenMintA.publicKey,

      tokenProgram: TOKEN_PROGRAM_ID,
      associated_token_program: ASSOCIATED_PROGRAM_ID,
    system_program: SystemProgram.programId,
    }).signers([admin]).rpc();

    const tokenConfigState = await program.account.tokenConfig.fetch(bridge_token_pda);
    console.log("tokenConfigState",  tokenConfigState)

    // todo this not working
    const tokenBalanceB = await connection.getTokenAccountBalance(bridge_token_account);
    console.log("tokenBalanceB", tokenBalanceB)

  });

  it('lock', async () => {
    const amount = new anchor.BN(100);

    const userAta1 = getAssociatedTokenAddressSync(tokenMintA.publicKey, user.publicKey)
    const [bridge_token_pda] = PublicKey.findProgramAddressSync([Buffer.from("token"), tokenMintA.publicKey.toBuffer()], program.programId)
    const bridge_token_account = getAssociatedTokenAddressSync(tokenMintA.publicKey, bridge_token_pda, true);

    console.log("userAta1", userAta1.toBase58())
    console.log("bridge_token_pda", bridge_token_pda.toBase58())
    console.log("bridge_token_account", bridge_token_account.toBase58())


    const tokenBalance = await connection.getTokenAccountBalance(userAta1);
    console.log("tokenBalance", tokenBalance)
    const tokenBalanceB = await connection.getTokenAccountBalance(bridge_token_account);
    console.log("tokenBalanceB", tokenBalanceB)



    // Lock tokens
    await program.methods.lock(amount, "0x228").accounts({
      state: state,
      sender: user.publicKey,
      sender_token_account: userAta1,
      bridge_token: bridge_token_pda,
      bridgeTokenAccount: bridge_token_account,
      mint: tokenMintA.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      system_program: SystemProgram.programId,
    }).signers([user]).rpc();

    const accountState = await program.account.globalState.fetch(state);
    assert.ok(+accountState.nonce === 1);

    // const nonceAccount = PublicKey.findProgramAddressSync([user.publicKey.toBuffer()], program.programId)[0];
    // const receiverNonce = await program.account.nonceAccount.fetch(nonceAccount);
    // console.log(receiverNonce);


    const tokenBalance2 = await connection.getTokenAccountBalance(userAta1);
    console.log(tokenBalance2)

  });

  it('should unlock tokens with valid nonce and signatures', async () => {
      const amount = new anchor.BN(50);


    const userAta1 = getAssociatedTokenAddressSync(tokenMintA.publicKey, user.publicKey)
    const [bridge_token_pda] = PublicKey.findProgramAddressSync([Buffer.from("token"), tokenMintA.publicKey.toBuffer()], program.programId)
    const bridge_token_account = getAssociatedTokenAddressSync(tokenMintA.publicKey, bridge_token_pda, true);

    console.log("userAta1", userAta1.toBase58())
    console.log("bridge_token_pda", bridge_token_pda.toBase58())
    console.log("bridge_token_account", bridge_token_account.toBase58())


    const tokenBalance = await connection.getTokenAccountBalance(userAta1);
    console.log("tokenBalance", tokenBalance)
    const tokenBalanceB = await connection.getTokenAccountBalance(bridge_token_account);
    console.log("tokenBalanceB", tokenBalanceB)

      // Unlock tokens
      await program.methods.unlock(amount, new anchor.BN(0), {
          accounts: {
            state: state,
            receiver: user.publicKey,
            receiver_token_account: userAta1,
            bridge_token: bridge_token_pda,
            bridgeTokenAccount: bridge_token_account,
            mint: tokenMintA.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            system_program: SystemProgram.programId,
          },
          signers: [user],
      });

      // const accountState = await program.account.globalState.fetch(state);
      // assert.ok(accountState.nonce === 1);
      //
      // const fromBalance = await tokenMint.getAccountInfo(fromTokenAccount);
      // const toBalance = await tokenMint.getAccountInfo(toTokenAccount);
      //
      // assert.ok(fromBalance.amount.toNumber() === amount.toNumber()); // Should have received the tokens back
      // assert.ok(toBalance.amount.toNumber() === 0); // Should have transferred out the tokens
  });

  // it('should enable and disable the state correctly', async () => {
  //     // Disable state
  //     await program.rpc.disable({
  //         accounts: {
  //             state,
  //             authority: admin.publicKey,
  //         },
  //         signers: [admin],
  //     });
  //
  //     let accountState = await program.account.globalState.fetch(state);
  //     assert.ok(!accountState.isEnable);
  //
  //     // Enable state
  //     await program.rpc.enable({
  //         accounts: {
  //             state,
  //             authority: admin.publicKey,
  //         },
  //         signers: [admin],
  //     });
  //
  //     accountState = await program.account.globalState.fetch(state);
  //     assert.ok(accountState.isEnable);
  // });
  //
});


export const mintingTokens = async (
  {
    connection,
    creator,
    holder = creator,
    tokenKeypair,
    mintedAmount = 100,
    decimals = 6,
  }: {
    connection: Connection;
    creator: Signer;
    holder?: Signer;
    tokenKeypair: Keypair;
    mintedAmount?: number;
    decimals?: number;
  }) => {

  await createMint(connection, creator, creator.publicKey, creator.publicKey, decimals, tokenKeypair);
  const ata = await getOrCreateAssociatedTokenAccount(connection, creator, tokenKeypair.publicKey, holder.publicKey, true);
  await mintTo(connection, creator, tokenKeypair.publicKey, ata.address, creator.publicKey, mintedAmount * 10 ** decimals,);
  return ata;
};


function hexToUint8Array(hexString: string) {
  if (hexString.startsWith("0x"))
    hexString = hexString.slice(2); // Remove "0x" prefix if present
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  return bytes;
}


async function requestSol(account, connection, amount=5) {
  console.log(`Requesting airdrop for SOL : ${account.publicKey.toBase58()}`)
  const signature = await connection.requestAirdrop(account.publicKey, amount * 10 ** 9);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'finalized');
  console.log("account wallet balance : ", account.publicKey.toBase58(), (await connection.getBalance(account.publicKey)) / 10 ** 9, "SOL")
}
