import { Connection, PublicKey, sendAndConfirmTransaction, type Signer, Transaction } from "@solana/web3.js";
import { getBridgeAccounts, getOrCreateUserATA, getUserNoncePda } from "./utils";
import { Program } from "@coral-xyz/anchor";
import { MultisigNonce } from "../../target/types/multisig_nonce";
import { newEd25519Instruction } from "./ed25519_ix";
import { getReceivePayload } from "../backend/signs";

async function receive(
  connection: Connection,
  user: Signer,
  token: PublicKey,
  bridgeProgram: Program<MultisigNonce>,
  flags: any  // todo
) {
  const user_token_ata = (await getOrCreateUserATA(connection, user, token)).address;
  const nonceAccount = getUserNoncePda(user.publicKey, bridgeProgram.programId);

  const {payload, message, signers, signatures} = await getReceivePayload(user.publicKey, token);
  const verifyInstruction = newEd25519Instruction(5, message, signers, signatures);

  const receiveInstruction = await bridgeProgram.methods.unlock(payload).accounts({
    receiver: user.publicKey,
    receiverTokenAccount: user_token_ata,
    receiverNonceAccount: nonceAccount,
    ...getBridgeAccounts(token, bridgeProgram.programId),
  }).signers([user]).instruction()

  const tx = new Transaction().add(verifyInstruction, receiveInstruction);
  tx.feePayer = user.publicKey;
   // wait for transaction to be confirmed
  return await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });

}


