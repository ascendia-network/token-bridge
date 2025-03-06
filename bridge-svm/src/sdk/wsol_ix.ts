import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync
} from "@solana/spl-token";

export async function wrapSolInstructions(connection: Connection, userFrom: Keypair, tokenFrom: PublicKey, amountToSend: number) {
  const instructions = [];

  const userATA = getAssociatedTokenAddressSync(tokenFrom, userFrom.publicKey);

  let balance = 0;
  try {
    balance = +(await connection.getTokenAccountBalance(userATA)).value.amount;
  } catch (e) {
    console.log("need to create user WSOL ATA")
    instructions.push(
      createAssociatedTokenAccountInstruction(userFrom.publicKey, userATA, userFrom.publicKey, tokenFrom)
    );
  }

  if (balance < amountToSend) {
    console.log("need to wrap some SOL", amountToSend - balance)
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: userFrom.publicKey,
        toPubkey: userATA,
        lamports: amountToSend - balance,
      }),
      createSyncNativeInstruction(userATA)  // update ata balance
    );
  }

  return instructions;
}
