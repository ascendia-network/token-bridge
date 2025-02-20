import { hexToUint8Array } from "./utils";
import { Connection, PublicKey, sendAndConfirmTransaction, type Signer, Transaction } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { getSendPayload } from "../backend/signs";
import { newEd25519Instruction } from "./ed25519_ix";
import type { AmbSolBridge } from "../idl/idlType";


export async function send(
  connection: Connection,
  tokenFrom: PublicKey,
  tokenTo: string,
  userFrom: Signer,
  userTo: string,
  bridgeProgram: Program<AmbSolBridge>,
  amountToSend: number,
  flags: any  // todo
) {
  // const user_token_ata = await getOrCreateUserATA(connection, userFrom, tokenFrom);

  const { payload, message, signers, signatures } = await getSendPayload(tokenFrom, tokenTo, amountToSend, flags);
  const verifyInstruction = newEd25519Instruction(message, signers, signatures);

  // Lock tokens
  const sendInstruction = await bridgeProgram.methods.send(payload, [...hexToUint8Array(userTo)]).accounts({
    sender: userFrom.publicKey,
    mint: tokenFrom,
  }).signers([userFrom]).instruction();


  const tx = new Transaction().add(verifyInstruction, sendInstruction);
  tx.feePayer = userFrom.publicKey;
  return await sendAndConfirmTransaction(connection, tx, [userFrom], { commitment: 'confirmed' }); // wait for transaction to be confirmed
}
