import { getBridgeAccounts, getOrCreateUserATA, hexToUint8Array } from "./utils";
import { Connection, PublicKey, sendAndConfirmTransaction, type Signer, Transaction } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { MultisigNonce } from "../../target/types/multisig_nonce";
import { getSendPayload } from "../backend/signs";
import { newEd25519Instruction } from "./ed25519_ix";


async function send(
  connection: Connection,
  tokenFrom: PublicKey,
  tokenTo: string,
  userFrom: Signer,
  userTo: string,
  bridgeProgram: Program<MultisigNonce>,
  amountToSend: number,
  flags: any  // todo
) {
  const user_token_ata = (await getOrCreateUserATA(connection, userFrom, tokenFrom)).address;

  const { payload, message, signers, signatures } = await getSendPayload(tokenFrom, tokenTo, amountToSend, flags);
  const verifyInstruction = newEd25519Instruction(message, signers, signatures);

  // Lock tokens
  const sendInstruction = await bridgeProgram.methods.lock(payload, hexToUint8Array(userTo)).accounts({
    sender: userFrom.publicKey,
    senderTokenAccount: user_token_ata,
    ...getBridgeAccounts(tokenFrom, bridgeProgram.programId),
  }).signers([userFrom]).instruction();


  const tx = new Transaction().add(verifyInstruction, sendInstruction);
  tx.feePayer = userFrom.publicKey;
  return await sendAndConfirmTransaction(connection, tx, [userFrom], { commitment: 'confirmed' }); // wait for transaction to be confirmed
}
