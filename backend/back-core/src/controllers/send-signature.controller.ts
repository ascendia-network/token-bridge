/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */
import { getFees } from '../fee'
import { ethers } from 'ethers'
import { sendSignerPK } from '../../config'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { bigIntToBuffer } from '../utils/buffer'

const EVM_NETWORKS = ['ambrosus', 'base', 'ethereum', 'bsc']

interface SendSignatureArgs {
  networkFrom: string
  networkTo: string
  tokenAddress: string
  amount: string
  isMaxAmount: boolean
}

interface SendPayload {
  tokenAddress: string,
  amountToSend: string,
  feeAmount: string,
  timestamp: number,
  flags: string,
  flagData: string,
}

export class SendSignatureController {

  constructor() {
  }

  async getSendSignature({ networkFrom, networkTo, tokenAddress, amount, isMaxAmount }: SendSignatureArgs) {
    const { feeAmount, amountToSend } = await getFees(networkFrom, networkTo, tokenAddress, amount, isMaxAmount)
    const timestamp = Date.now() / 1000
    const flags = '0x0'
    const flagData = ''

    const sendPayload: SendPayload = {
      tokenAddress,
      amountToSend,
      feeAmount,
      timestamp,
      flags,
      flagData,
    }
    let signature
    if (EVM_NETWORKS.includes(networkFrom)) {
      signature = await this.signEvmSendPayload(sendPayload, sendSignerPK)
    } else if (networkFrom === 'solana') {
      signature = await this.signSvmSendPayload(sendPayload, sendSignerPK)
    }

    return { sendPayload, signature }
  }

  async signEvmSendPayload(sendPayload: SendPayload, sendSignerPK: string) {
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint', 'uint', 'uint', 'uint', 'bytes'],
      [
        sendPayload.tokenAddress,
        sendPayload.amountToSend,
        sendPayload.feeAmount,
        sendPayload.timestamp,
        sendPayload.flags,
        sendPayload.flagData,
      ],
    )
    const signer = new ethers.Wallet(sendSignerPK)
    return await signer.signMessage(ethers.getBytes(payload))
  }

  async signSvmSendPayload(sendPayload: SendPayload, sendSignerPK: string) {
    const signer = Keypair.fromSecretKey(bs58.decode(sendSignerPK))

    const payload = Buffer.concat([
      Buffer.from(sendPayload.tokenAddress, 'hex'),
      bigIntToBuffer(BigInt(sendPayload.amountToSend), 8),
      bigIntToBuffer(BigInt(sendPayload.feeAmount), 8),
      bigIntToBuffer(BigInt(sendPayload.timestamp), 8),
      bigIntToBuffer(BigInt(sendPayload.flags), 4),
      Buffer.from(sendPayload.flagData, 'hex'),
    ])

    const signature = nacl.sign.detached(payload, signer.secretKey)

    return bs58.encode(signature)
  }
}

