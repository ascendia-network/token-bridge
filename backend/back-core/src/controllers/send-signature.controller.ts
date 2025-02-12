/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */
import { getFees } from "../fee";
import { ethers } from "ethers";
import { sendSignerPK } from "../../config";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { bigIntToBuffer } from "../utils/buffer";

const EVM_NETWORKS = ["22040", "16718", "1", "56", "8453"];

const CHAIN_ID_TO_CHAIN_NAME: Record<string, string> = {
  "22040": "amb-test",
  "16718": "amb",
  "1": "eth",
  "56": "bsc",
  "8453": "base",
  "37682073643888590243866347653768361305805979805942384833434275429159048052736": "solana"
};

interface SendSignatureArgs {
  networkFrom: string;
  networkTo: string;
  tokenAddress: string;
  externalTokenAddress: string;
  amount: string;
  isMaxAmount: boolean;
}

interface SendPayload {
  destChainId: string;
  tokenAddress: string;
  externalTokenAddress: string;
  amountToSend: string;
  feeAmount: string;
  timestamp: number;
  flags: string;
  flagData: string;
}

export class SendSignatureController {

  constructor() {
  }

  async getSendSignature({
                           networkFrom,
                           networkTo,
                           tokenAddress,
                           amount,
                           isMaxAmount,
                           externalTokenAddress
                         }: SendSignatureArgs) {
    const {
      feeAmount,
      amountToSend
    } = await getFees(CHAIN_ID_TO_CHAIN_NAME[networkFrom], networkTo, tokenAddress, amount, isMaxAmount);
    const timestamp = Date.now() / 1000;
    const flags = "0x0";
    const flagData = "";

    const sendPayload: SendPayload = {
      destChainId: networkTo,
      tokenAddress,
      externalTokenAddress,
      amountToSend,
      feeAmount,
      timestamp,
      flags,
      flagData
    };
    let signature;
    if (EVM_NETWORKS.includes(networkFrom)) {
      signature = await this.signEvmSendPayload(sendPayload, sendSignerPK);
    } else if (CHAIN_ID_TO_CHAIN_NAME[networkFrom] === "solana") {
      signature = await this.signSvmSendPayload(sendPayload, sendSignerPK);
    } else {
      throw new Error("Unsupported network");
    }

    return { sendPayload, signature };
  }

  async signEvmSendPayload(sendPayload: SendPayload, sendSignerPK: string) {
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint", "bytes32", "bytes32", "uint", "uint", "uint", "uint", "bytes"],
      [
        sendPayload.destChainId,
        sendPayload.tokenAddress,
        sendPayload.externalTokenAddress,
        sendPayload.amountToSend,
        sendPayload.feeAmount,
        sendPayload.timestamp,
        sendPayload.flags,
        sendPayload.flagData
      ]
    );
    const signer = new ethers.Wallet(sendSignerPK);
    return await signer.signMessage(ethers.getBytes(payload));
  }

  async signSvmSendPayload(sendPayload: SendPayload, sendSignerPK: string) {
    const signer = Keypair.fromSecretKey(bs58.decode(sendSignerPK));

    const payload = Buffer.concat([
      bigIntToBuffer(BigInt(sendPayload.destChainId), 8),
      Buffer.from(sendPayload.tokenAddress, "hex"),
      Buffer.from(sendPayload.externalTokenAddress, "hex"),
      bigIntToBuffer(BigInt(sendPayload.amountToSend), 8),
      bigIntToBuffer(BigInt(sendPayload.feeAmount), 8),
      bigIntToBuffer(BigInt(sendPayload.timestamp), 8),
      bigIntToBuffer(BigInt(sendPayload.flags), 4),
      Buffer.from(sendPayload.flagData, "hex")
    ]);

    const signature = nacl.sign.detached(payload, signer.secretKey);

    return bs58.encode(signature);
  }
}

