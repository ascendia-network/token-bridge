import { PublicKey, Signer } from "@solana/web3.js";
import { hexToKeypair, hexToUint8Array, numberToUint8Array, SOLANA_CHAIN_ID } from "../sdk/utils";
import { keccak_256 } from "@noble/hashes/sha3";
import nacl from "tweetnacl";
import { ReceivePayload, SendPayload, serializeReceivePayload, serializeSendPayload } from "./types";

// random keys
export const sendSigner = hexToKeypair("442c9635e84855d6453090903f4633fe46a5e25ff3d341fd9c5c44d50d725bf0a0d917b80758d69815f2e496adf902f0eddab4cd06c4c2a235b7c6f41fd76c7a");
export const receiveSigners = [
  '7dc8f638bcdcf50de3e403becf06092b7bbaab652e97c5ff318d346301d57056cf05ee975017057aa5855af7e939af606f07be367bf8f16183edbc3af49d5f0f',
  '09d7eda711711da17e8726c9506478bad353fb3eab01990a4a9930e53b657baa3189c2bc3426ef20782b6beb6f337399ecc354ade5be3c8e8144e446eb5b82b1',
  'e040bfcd37b9ef96235375b36f5ca4d224cbf7b06c3958653e02e344e431e814ed8c31c8cd40660e7e6643e789a6134aa095f78f9f46be19eaefb2ec52ad6586',
  '1c66f63a7dc16184fb805b0672e2186df3a7aa106e5539bfe073557fbf0c396150f4326b6f81269f249331085d51b2bb62d57313b66d3e7dd475692082501fb0',
  '759bf7e20e52390c7304d045379478810e37d8e84aaefbe211f758795fdd0796eb4887aaae7d5030d6f0011d070f30d5c98497804b93355af79b84f9389fa919'
].map(hexToKeypair);

const receiveSignersBuffer = Buffer.alloc(32 * receiveSigners.length);
receiveSigners.forEach((signer, i) => receiveSignersBuffer.set(signer.publicKey.toBuffer(), i * 32));
// hash of all receive_signers public keys concatenated. contract will store only this value to save some storage space
export const receiveSigner = new PublicKey(keccak_256(receiveSignersBuffer));




export async function getReceivePayload(user: PublicKey) {
  // get from db
  const value: ReceivePayload = {
    to: user.toBytes(),
    tokenAddressTo: hexToUint8Array("0x999999999988888888888888777777777777776666666666666665555555555"),
    amountTo: 50,
    chainTo: SOLANA_CHAIN_ID,
    eventId: 1,
    flags: new Uint8Array(32),  // todo
    flagData: numberToUint8Array(0, 8),  // todo
  };

  const payload = serializeReceivePayload(value);
  return {value, ...signMessage(payload, receiveSigners)};
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
