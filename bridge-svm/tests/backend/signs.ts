import { PublicKey, Signer } from "@solana/web3.js";
import { hexToUint8Array, SOLANA_CHAIN_ID } from "../sdk/utils";
import { keccak_256 } from "@noble/hashes/sha3";
import nacl from "tweetnacl";
import { ReceivePayload, SendPayload, serializeReceivePayload, serializeSendPayload } from "./types";
import * as anchor from "@coral-xyz/anchor";

export const sendSigner = anchor.web3.Keypair.generate();
export const receiveSigners = [anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate()];



export async function getReceivePayload(user: PublicKey, token: PublicKey) {
  // get from db
  const value: ReceivePayload = {
    to: user.toBytes(),
    tokenAddressTo: token.toBytes(),
    amountTo: 50,
    chainTo: SOLANA_CHAIN_ID,
    flags: new Uint8Array(32),  // todo
    flagData: new Uint8Array(0),  // todo
    nonce: 0,
  };

  const payload = serializeReceivePayload(value);
  return signMessage(payload, receiveSigners)
}


export async function getSendPayload(
  tokenAddressFrom: PublicKey,
  tokenAddressTo: string,
  amountToSend: number,
  flags: any
) {
  const feeAmount = 1; // todo
  const timestamp = Math.floor(Date.now() / 1000);

  const value: SendPayload = {
    tokenAddressFrom: tokenAddressFrom.toBytes(),
    tokenAddressTo: hexToUint8Array(tokenAddressTo),
    amountToSend: amountToSend,
    feeAmount,
    chainFrom: SOLANA_CHAIN_ID,
    timestamp,
    flags: new Uint8Array(32), // todo
    flagData: new Uint8Array(0),  // todo
  };

  const payload = serializeSendPayload(value);
  return signMessage(payload, [sendSigner])
}



export function signMessage(payload: Buffer, signers: Signer[]) {
  const message = keccak_256(payload)

  const signersBytes = signers.map(signer => signer.publicKey.toBytes());
  const signatures = signers.map(signer => nacl.sign.detached(message, signer.secretKey));

  return { payload, message, signers: signersBytes, signatures }
}
