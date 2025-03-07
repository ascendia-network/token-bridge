import { Keypair, PublicKey, Signer } from "@solana/web3.js";
import { hexToUint8Array, numberToUint8Array, SOLANA_CHAIN_ID } from "../sdk/utils";
import { keccak_256 } from "@noble/hashes/sha3";
import nacl from "tweetnacl";
import {
  BackendSignature,
  IBackend,
  ReceivePayload,
  SendPayload,
  serializeReceivePayload,
  serializeSendPayload,
  SignedPayload
} from "./types";

// random keys
export const sendSigner = Keypair.fromSecretKey(new Uint8Array([68, 44, 150, 53, 232, 72, 85, 214, 69, 48, 144, 144, 63, 70, 51, 254, 70, 165, 226, 95, 243, 211, 65, 253, 156, 92, 68, 213, 13, 114, 91, 240, 160, 217, 23, 184, 7, 88, 214, 152, 21, 242, 228, 150, 173, 249, 2, 240, 237, 218, 180, 205, 6, 196, 194, 162, 53, 183, 198, 244, 31, 215, 108, 122]));

export const receiveSigners = [
  new Uint8Array([125, 200, 246, 56, 188, 220, 245, 13, 227, 228, 3, 190, 207, 6, 9, 43, 123, 186, 171, 101, 46, 151, 197, 255, 49, 141, 52, 99, 1, 213, 112, 86, 207, 5, 238, 151, 80, 23, 5, 122, 165, 133, 90, 247, 233, 57, 175, 96, 111, 7, 190, 54, 123, 248, 241, 97, 131, 237, 188, 58, 244, 157, 95, 15]),
  new Uint8Array([9, 215, 237, 167, 17, 113, 29, 161, 126, 135, 38, 201, 80, 100, 120, 186, 211, 83, 251, 62, 171, 1, 153, 10, 74, 153, 48, 229, 59, 101, 123, 170, 49, 137, 194, 188, 52, 38, 239, 32, 120, 43, 107, 235, 111, 51, 115, 153, 236, 195, 84, 173, 229, 190, 60, 142, 129, 68, 228, 70, 235, 91, 130, 177]),
  new Uint8Array([224, 64, 191, 205, 55, 185, 239, 150, 35, 83, 117, 179, 111, 92, 164, 210, 36, 203, 247, 176, 108, 57, 88, 101, 62, 2, 227, 68, 228, 49, 232, 20, 237, 140, 49, 200, 205, 64, 102, 14, 126, 102, 67, 231, 137, 166, 19, 74, 160, 149, 247, 143, 159, 70, 190, 25, 234, 239, 178, 236, 82, 173, 101, 134]),
  new Uint8Array([28, 102, 246, 58, 125, 193, 97, 132, 251, 128, 91, 6, 114, 226, 24, 109, 243, 167, 170, 16, 110, 85, 57, 191, 224, 115, 85, 127, 191, 12, 57, 97, 80, 244, 50, 107, 111, 129, 38, 159, 36, 147, 49, 8, 93, 81, 178, 187, 98, 213, 115, 19, 182, 109, 62, 125, 212, 117, 105, 32, 130, 80, 31, 176]),
  new Uint8Array([117, 155, 247, 226, 14, 82, 57, 12, 115, 4, 208, 69, 55, 148, 120, 129, 14, 55, 216, 232, 74, 174, 251, 226, 17, 247, 88, 121, 95, 221, 7, 150, 235, 72, 135, 170, 174, 125, 80, 48, 214, 240, 1, 29, 7, 15, 48, 213, 201, 132, 151, 128, 75, 147, 53, 90, 247, 155, 132, 249, 56, 159, 169, 25])
].map(secretKey => Keypair.fromSecretKey(secretKey));


const receiveSignersBuffer = Buffer.alloc(32 * receiveSigners.length);
receiveSigners.forEach((signer, i) => receiveSignersBuffer.set(signer.publicKey.toBuffer(), i * 32));
// hash of all receive_signers public keys concatenated. contract will store only this value to save some storage space
export const receiveSigner = new PublicKey(keccak_256(receiveSignersBuffer));


export async function getReceivePayload(user: PublicKey, token: PublicKey, amountTo: number, nonce: number, eventId: number): Promise<SignedPayload<ReceivePayload>> {
  // get from db
  const payload: ReceivePayload = {
    to: user.toBytes(),
    tokenAddressTo: token.toBytes(),
    amountTo,
    chainTo: SOLANA_CHAIN_ID,
    eventId,
    flags: new Uint8Array(32),  // todo
    flagData: numberToUint8Array(nonce, 8),  // todo
  };

  const serializedPayload = serializeReceivePayload(payload);
  const signature = signMessage(serializedPayload, receiveSigners);
  return { payload, serializedPayload, signature };
}


export async function getSendPayload(
  tokenAddressFrom: PublicKey,
  tokenAddressTo: string,
  amountToSend: number,
  flags: any
): Promise<SignedPayload<SendPayload>> {
  const feeAmount = 1; // todo
  const timestamp = Math.floor(Date.now() / 1000);

  const payload: SendPayload = {
    tokenAddressFrom: tokenAddressFrom.toBytes(),
    tokenAddressTo: hexToUint8Array(tokenAddressTo),
    amountToSend: amountToSend,
    feeAmount,
    chainFrom: SOLANA_CHAIN_ID,
    timestamp,
    flags: new Uint8Array(32), // todo
    flagData: new Uint8Array(0),  // todo
  };

  const serializedPayload = serializeSendPayload(payload);
  const signature = signMessage(serializedPayload, [sendSigner]);
  return { payload, serializedPayload, signature }
}


export function signMessage(serializedPayload: Buffer, signers: Signer[]): BackendSignature {
  const message = keccak_256(serializedPayload)

  const signersBytes = signers.map(signer => signer.publicKey.toBytes());
  const signatures = signers.map(signer => nacl.sign.detached(message, signer.secretKey));

  return { message, signers: signersBytes, signatures }
}


export const backendMock: IBackend = {
  getReceivePayload,
  getSendPayload
}
