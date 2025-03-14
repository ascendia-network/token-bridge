import { getBridgeTokenInfo, hexToUint8Array } from "./utils";
import { Connection, PublicKey, sendAndConfirmTransaction, type Signer, Transaction } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { verifySignatureInstruction } from "./ed25519_ix";
import type { AmbSolBridge } from "../idl/idlType";
import { wrapSolInstructions } from "./wsol_ix";
import { NATIVE_MINT } from "@solana/spl-token";
import { IBackend } from "../backend/types";


export async function send(
  connection: Connection,
  tokenFrom: PublicKey,
  tokenTo: string,
  userFrom: Signer,
  userTo: string,
  bridgeProgram: Program<AmbSolBridge>,
  amountToSend: number,
  flags: any,  // todo
  backend: IBackend
) {
  const { serializedPayload, signature } = await backend.getSendPayload(tokenFrom, tokenTo, amountToSend, flags);
  const verifyInstruction = verifySignatureInstruction(signature);

  const { isMintable } = await getBridgeTokenInfo(bridgeProgram, tokenFrom);

  const wrapInstructions = (tokenFrom == NATIVE_MINT) ?
    await wrapSolInstructions(connection, userFrom, amountToSend) : [];

  const sendInstruction = await bridgeProgram.methods
    .send(serializedPayload, [...hexToUint8Array(userTo)])
    .accountsPartial({
      sender: userFrom.publicKey,
      mint: tokenFrom,
      bridgeTokenAccount: isMintable ? null : undefined,  // pass null to not use bridge token account
    }).signers([userFrom]).instruction();


  const tx = new Transaction().add(...wrapInstructions, verifyInstruction, sendInstruction);
  tx.feePayer = userFrom.publicKey;
  return await sendAndConfirmTransaction(connection, tx, [userFrom], { commitment: 'confirmed' }); // wait for transaction to be confirmed
}
