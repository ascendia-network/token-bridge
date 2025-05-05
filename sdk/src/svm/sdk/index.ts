import {
  checkFlags,
  hexToUint8Array,
  numberToUint8Array,
  bignumberToUint8Array,
  getBridgeTokenInfo,
  getBridgeStateAccount,
  getBridgeTokenAccounts,
  getOrCreateUserATA,
  getUserNoncePda,
  getUserNonceValue,
  getReceiptNonce,
  initializeToken,
  Flags,
} from "./utils";
import {
  convertReceivePayload,
  convertSendPayload,
  convertSignatures,
  serializeReceivePayload,
  serializeSendPayload,
} from "./types";
export const helpers = {
  checkFlags,
  hexToUint8Array,
  numberToUint8Array,
  bignumberToUint8Array,
  getBridgeTokenInfo,
  getBridgeStateAccount,
  getBridgeTokenAccounts,
  getOrCreateUserATA,
  getUserNoncePda,
  getUserNonceValue,
  getReceiptNonce,
  initializeToken,
  Flags,
  convertReceivePayload,
  convertSendPayload,
  convertSignatures,
  serializeReceivePayload,
  serializeSendPayload,
};

import { receive } from "./receive";
import { send } from "./send";
import { verifySignatureInstruction } from "./ed25519_ix";
import { wrapSolInstructions, unwrapWSolInstruction } from "./wsol_ix";
export const contract = {
  calls: {
    receive,
    send,
  },
  instructions: {
    verifySignatureInstruction,
    wrapSolInstructions,
    unwrapWSolInstruction,
  },
};

export type * as types from "./types";
