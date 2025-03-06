import { Buffer } from "buffer";
import { BN, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, sendAndConfirmTransaction, type Signer, Transaction } from "@solana/web3.js";
import type { AmbSolBridge } from "../idl/idlType";
import { getReceivePayload } from "../backend/signs";
import { newEd25519Instruction } from "./ed25519_ix";
import { unwrapWSolInstruction } from "./wsol_ix";
import { checkFlags, Flags, getBridgeTokenInfo } from "./utils";
import { NATIVE_MINT } from "@solana/spl-token";

export async function receive(
  connection: Connection,
  user: Signer,
  bridgeProgram: Program<AmbSolBridge>,
) {
  const { value, payload, message, signers, signatures } = await getReceivePayload(user.publicKey);
  const token = new PublicKey(value.tokenAddressTo)

  const { isMintable } = await getBridgeTokenInfo(bridgeProgram, new PublicKey(value.tokenAddressTo));
  const shouldUnwrap = token == NATIVE_MINT && checkFlags(value.flags, Flags.SHOULD_UNWRAP);

  const verifyInstruction = newEd25519Instruction(message, signers, signatures);
  const unwrapInstructions = shouldUnwrap ? [unwrapWSolInstruction(user.publicKey)] : [];

  const receiveInstruction = await bridgeProgram.methods
    .receive(
      new BN(value.amountTo),
      new BN(value.eventId),
      [...value.flags],
      Buffer.from(value.flagData)
    ).accountsPartial({
      receiver: user.publicKey,
      mint: token,
      bridgeTokenAccount: isMintable ? null : undefined,  // pass null to not use bridge token account
    }).signers([user]).instruction()

  const tx = new Transaction().add(...unwrapInstructions, verifyInstruction, receiveInstruction);
  tx.feePayer = user.publicKey;
  // wait for transaction to be confirmed
  return await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });

}

