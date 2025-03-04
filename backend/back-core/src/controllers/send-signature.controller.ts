/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */
import { getFees } from "../fee";
import { sendSignerPK } from "../../config";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { bigIntToBuffer } from "../utils/buffer";
import { encodeAbiParameters, hashMessage, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SendPayload } from "../routes/utils";
import { SOLANA_CHAIN_ID, SOLANA_DEV_CHAIN_ID } from "../utils/solana";

const EVM_NETWORKS = [
  "16718", // amb
  "8453", // base
  "1", // eth
  "56", // bsc
  "22040", // amb-test
  "84532" // base-test
];
const CHAIN_ID_TO_CHAIN_NAME: Record<string, string> = {
  "1": "eth",
  "56": "bsc",
  "8453": "base",
  "16718": "amb",
  "6003100671677628416": "solana",
  // testnets
  "22040": "amb-test",
  "84532": "base-test",
  "6003100671677645902": "solana-dev",
};

interface SendSignatureArgs {
  networkFrom: bigint;
  networkTo: bigint;
  tokenAddress: string;
  externalTokenAddress: string;
  amount: bigint;
  isMaxAmount: boolean;
  flags: bigint;
  flagData: string;
}

export class SendSignatureController {
  constructor() {}

  async getSendSignature({
    networkFrom,
    networkTo,
    tokenAddress,
    amount,
    isMaxAmount,
    externalTokenAddress,
    flags,
    flagData,
  }: SendSignatureArgs) {
    if (
      !CHAIN_ID_TO_CHAIN_NAME[networkFrom.toString()] ||
      !CHAIN_ID_TO_CHAIN_NAME[networkTo.toString()]
    ) {
      throw new Error("Invalid network id");
    }
    const { feeAmount, amountToSend } = await getFees(
      CHAIN_ID_TO_CHAIN_NAME[networkFrom.toString()],
      CHAIN_ID_TO_CHAIN_NAME[networkTo.toString()],
      tokenAddress,
      amount,
      isMaxAmount
    );
    const timestamp = Date.now() / 1000;

    const sendPayload: SendPayload = {
      destChainId: networkTo,
      tokenAddress,
      externalTokenAddress,
      amountToSend,
      feeAmount,
      timestamp,
      flags,
      flagData,
    };
    let signature;

    switch (networkFrom) {
      case SOLANA_CHAIN_ID:
      case SOLANA_DEV_CHAIN_ID:
        signature = await this.signSvmSendPayload(sendPayload, sendSignerPK);
        break;
      default:
        signature = await this.signEvmSendPayload(
          sendPayload,
          sendSignerPK as `0x${string}`
        );
        break;
    }
    return { sendPayload, signature };
  }

  async signEvmSendPayload(
    sendPayload: SendPayload,
    sendSignerPK: `0x${string}`
  ) {
    const PayloadAbi = {
      name: "payload",
      type: "tuple",
      internalType: "struct BridgeTypes.SendPayload",
      components: [
        {
          name: "destChainId",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "tokenAddress",
          type: "bytes32",
          internalType: "bytes32",
        },
        {
          name: "externalTokenAddress",
          type: "bytes32",
          internalType: "bytes32",
        },
        {
          name: "amountToSend",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "feeAmount",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "timestamp",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "flags",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "flagData",
          type: "bytes",
          internalType: "bytes",
        },
      ],
    };
    const payload = encodeAbiParameters<[typeof PayloadAbi]>(
      [PayloadAbi],
      [
        {
          destChainId: sendPayload.destChainId,
          tokenAddress: sendPayload.tokenAddress,
          externalTokenAddress: sendPayload.externalTokenAddress,
          amountToSend: sendPayload.amountToSend,
          feeAmount: sendPayload.feeAmount,
          timestamp: sendPayload.timestamp,
          flags: sendPayload.flags,
          flagData: sendPayload.flagData,
        },
      ]
    );
    const payloadHash = keccak256(payload);
    const digest = hashMessage({ raw: payloadHash });
    const signer = privateKeyToAccount(sendSignerPK);
    return await signer.signMessage({ message: digest });
  }

  async signSvmSendPayload(sendPayload: SendPayload, sendSignerPK: string) {
    const signer = Keypair.fromSecretKey(bs58.decode(sendSignerPK));

    const payload = Buffer.concat([
      bigIntToBuffer(BigInt(sendPayload.destChainId), 32),
      Buffer.from(sendPayload.tokenAddress, "hex"),
      Buffer.from(sendPayload.externalTokenAddress, "hex"),
      bigIntToBuffer(BigInt(sendPayload.amountToSend), 32),
      bigIntToBuffer(BigInt(sendPayload.feeAmount), 32),
      bigIntToBuffer(BigInt(sendPayload.timestamp), 32),
      bigIntToBuffer(BigInt(sendPayload.flags), 32),
      Buffer.from(sendPayload.flagData, "hex"),
    ]);

    const signature = nacl.sign.detached(payload, signer.secretKey);

    return bs58.encode(signature);
  }
}
