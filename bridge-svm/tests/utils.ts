import * as BufferLayout from "@solana/buffer-layout";
import { Buffer } from "buffer";
import * as borsh from "borsh";
import { Ed25519Program, TransactionInstruction } from "@solana/web3.js";

const SIGNATURE_OFFSETS_START = 2;
const SIGNATURE_OFFSETS_SERIALIZED_SIZE = 14;
const MESSAGE_SERIALIZED_SIZE = 32;
const PUBKEY_SERIALIZED_SIZE = 32;
const SIGNATURE_SERIALIZED_SIZE = 64;

const ED25519_INSTRUCTION_LAYOUT = BufferLayout.struct<any>([
  BufferLayout.u16('signatureOffset'),
  BufferLayout.u16('signatureInstructionIndex'),
  BufferLayout.u16('publicKeyOffset'),
  BufferLayout.u16('publicKeyInstructionIndex'),
  BufferLayout.u16('messageDataOffset'),
  BufferLayout.u16('messageDataSize'),
  BufferLayout.u16('messageInstructionIndex'),
]);

// multuple signatures but only one message!
// https://docs.rs/solana-sdk/2.1.5/src/solana_sdk/ed25519_instruction.rs.html
export function newEd25519Instruction(numSignatures, message, pubkeys, signatures, instructionIndex = 0xffff) {
  // Calculate offsets
  const offsetsDataEnd = SIGNATURE_OFFSETS_START + (numSignatures * SIGNATURE_OFFSETS_SERIALIZED_SIZE);
  const signsOffset = offsetsDataEnd;
  const pksOffset = signsOffset + (numSignatures * SIGNATURE_SERIALIZED_SIZE);
  const messageDataOffset = pksOffset + (numSignatures * PUBKEY_SERIALIZED_SIZE);

  const capacity = messageDataOffset + MESSAGE_SERIALIZED_SIZE

  const instructionData = Buffer.alloc(capacity);

  instructionData[0] = numSignatures;
  instructionData[1] = 0;

  // Write signature offsets and metadata
  for (let i = 0; i < numSignatures; i++) {
    const signatureOffset = signsOffset + i * SIGNATURE_SERIALIZED_SIZE;
    const publicKeyOffset = pksOffset + i * PUBKEY_SERIALIZED_SIZE;

    ED25519_INSTRUCTION_LAYOUT.encode(
      {
        signatureOffset,
        signatureInstructionIndex: instructionIndex,
        publicKeyOffset,
        publicKeyInstructionIndex: instructionIndex,
        messageDataOffset,
        messageDataSize: message.length,
        messageInstructionIndex: instructionIndex,
      },
      instructionData, SIGNATURE_OFFSETS_START + (i * SIGNATURE_OFFSETS_SERIALIZED_SIZE)
    );
  }


  signatures.forEach((sign, i) => {
    if (sign.length !== SIGNATURE_SERIALIZED_SIZE) throw new Error(`signature ${i} must be ${SIGNATURE_SERIALIZED_SIZE} bytes, got ${sign.length}`);
    const signatureOffset = signsOffset + i * SIGNATURE_SERIALIZED_SIZE;
    instructionData.fill(sign, signatureOffset);
  });


  pubkeys.forEach((pk, i) => {
    if (pk.length !== PUBKEY_SERIALIZED_SIZE) throw new Error(`public key ${i} must be ${PUBKEY_SERIALIZED_SIZE} bytes, got ${pk.length}`);
    const publicKeyOffset = pksOffset + i * PUBKEY_SERIALIZED_SIZE;
    instructionData.fill(pk, publicKeyOffset);
  });

  if (message.length !== MESSAGE_SERIALIZED_SIZE) throw new Error(`message must be ${MESSAGE_SERIALIZED_SIZE} bytes, got ${message.length}`);
  instructionData.fill(message, messageDataOffset);

  return new TransactionInstruction({
    keys: [],
    programId: Ed25519Program.programId,
    data: instructionData,
  })
}


export function hexToUint8Array(hexString: string) {
  if (hexString.startsWith("0x"))
    hexString = hexString.slice(2); // Remove "0x" prefix if present
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  return bytes;
}


const _b20 = { array: { type: 'u8', len: 20 } };
const _b32 = { array: { type: 'u8', len: 32 } };


export interface SendPayload {
  tokenAddress: Uint8Array;
  tokenAddressTo: Uint8Array;
  amountToSend: number;
  feeAmount: number;
  chainFrom: number;
  timestamp: number;
  flags: Uint8Array;
  flagData: Uint8Array;
}

const sendSchema = {
  tokenAddress: _b32,
  tokenAddressTo: _b20,
  amountToSend: 'u64',
  feeAmount: 'u64',
  chainFrom: 'u64',
  timestamp: 'u64',
  flags: _b32,
  flagData: { array: { type: 'u8' } },
}

export interface ReceivePayload {
  to: Uint8Array;
  tokenAddressTo: Uint8Array;
  amountTo: number;
  chainTo: number;
  flags: Uint8Array;
  flagData: Uint8Array;
  nonce: number;
}

const receiveSchema = {
  to: _b32,
  tokenAddressTo: _b32,
  amountTo: 'u64',
  chainTo: 'u64',
  flags: _b32,
  flagData: { array: { type: 'u8' } },
  nonce: 'u64'
}


export const serializeSendPayload = (value: SendPayload) => serialize(value, sendSchema);
export const serializeReceivePayload = (value: ReceivePayload) => serialize(value, receiveSchema)
export const serialize = (value: ReceivePayload, schema: any) => Buffer.from(borsh.serialize({ struct: schema }, value));
