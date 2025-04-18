import { Keypair, PublicKey, Signer } from "@solana/web3.js";
import { AMB_CHAIN_ID, getSolanaAccount, hexToUint8Array, numberToUint8Array, SOLANA_CHAIN_ID } from "../sdk/utils";
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
  getSolanaAccount("flower hurdle marriage hand track spawn exhibit ketchup cradle glove domain absent couple churn round"),
  getSolanaAccount("length need emerge identify plunge target ensure symbol discover copy spare cloud pact pyramid cloth"),
  getSolanaAccount("build suggest habit chase chat text want slogan liar finger bulk vast cost consider evil"),
  getSolanaAccount("assault egg legend trick beyond benefit adjust recall dry grit stick under swarm figure exile"),
  getSolanaAccount("hood animal fancy camera twist marriage group travel flag six chalk grit lecture burst scissors"),
].sort((a, b) => a.publicKey.toBase58().localeCompare(b.publicKey.toBase58()));

// receiveSigners.forEach(signer => console.log(signer.publicKey.toBase58()))

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
    chainFrom: AMB_CHAIN_ID,
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
    chainTo: AMB_CHAIN_ID,
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
