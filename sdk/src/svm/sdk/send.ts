import { getBridgeTokenInfo, hexToUint8Array } from "./utils";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { verifySignatureInstruction } from "./ed25519_ix";
import type { AmbSolBridge } from "../idl/idlType";
import { wrapSolInstructions } from "./wsol_ix";
import { NATIVE_MINT } from "@solana/spl-token";
import type { SendPayloadResponse } from "../../types";
import { convertSendPayload, serializeSendPayload } from "./types";
import { keccak_256 } from "@noble/hashes/sha3";
import { Base58 } from "ox";

export async function send(
  connection: Connection,
  bridgeProgram: Program<AmbSolBridge>,
  userFrom: PublicKey,
  userTo: string,
  sendPayloadResponse: SendPayloadResponse
) {
  const { sendPayload, signedBy, signature } = sendPayloadResponse;
  const payload = convertSendPayload(sendPayload);
  const serializedPayload = serializeSendPayload(payload);

  const signer = Base58.toBytes(signedBy); // convert Base58 encoded public key to bytes
  const signatureMessage = keccak_256(serializedPayload)
  const verifyInstruction = verifySignatureInstruction(signatureMessage, [signer], [hexToUint8Array(signature)]);

  const tokenFrom = new PublicKey(payload.tokenAddressFrom)
  const { isMintable } = await getBridgeTokenInfo(bridgeProgram, tokenFrom);

  const wrapInstructions = (tokenFrom == NATIVE_MINT) ?
    await wrapSolInstructions(connection, userFrom, Number(payload.amountToSend)) : [];

  const sendInstruction = await bridgeProgram.methods
    .send(serializedPayload, [...hexToUint8Array(userTo)])
    .accountsPartial({
      sender: userFrom,
      mint: tokenFrom,
      bridgeTokenAccount: isMintable ? null : undefined,  // pass null to not use bridge token account
    }).instruction();


  const tx = new Transaction().add(...wrapInstructions, verifyInstruction, sendInstruction);
  tx.feePayer = userFrom;
  return tx;
}


