import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { bytesToHex, encodePacked, type Hex, keccak256, type PrivateKeyAccount, toBytes, } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

import { getFees } from "../fee";
import { SendPayload } from "../routes/utils";
import { getSolanaAccount, SendPayload as SolanaSendPayloadSerialize, serializeSendPayload, } from "../utils/solana";
import { Networks } from "../utils/networks";
import { addressToUserFriendly } from "../utils/addresses";

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
  solanaSigner: Keypair;
  evmSigner: PrivateKeyAccount;

  constructor(mnemonic: string) {
    const { secretKey: solanaPK } = getSolanaAccount(mnemonic);
    const emvPK =
      "0x" +
      Buffer.from(
        mnemonicToAccount(mnemonic, { addressIndex: 1 }).getHdKey().privateKey!
      ).toString("hex");
    this.solanaSigner = Keypair.fromSecretKey(solanaPK);
    this.evmSigner = privateKeyToAccount(emvPK as `0x${string}`);
    console.log("SendSignatureController created")
  }

  async getSendSignature(
    {
      networkFrom,
      networkTo,
      tokenAddress,
      amount,
      isMaxAmount,
      externalTokenAddress,
      flags,
      flagData,
    }: SendSignatureArgs
  ) {
    if (!Networks.isSupportedNetwork(networkFrom)) {
      throw new Error(`Network From (${networkFrom}) is not supported`);
    }
    if (!Networks.isSupportedNetwork(networkTo)) {
      throw new Error(`Network To (${networkTo}) is not supported`);
    }
    const { feeAmount, amountToSend } = await getFees(
      networkFrom, networkTo, addressToUserFriendly(tokenAddress), amount, isMaxAmount
    );
    const timestamp = Math.floor(Date.now() / 1000);

    let signResult: { signature: Hex; signedBy: string },
      sendPayload: SendPayload;
    
    if (Networks.isSolana(networkFrom)) {
      sendPayload = {
        tokenAddressFrom: bytesToHex(toBytes(tokenAddress, { size: 32 })),
        tokenAddressTo: bytesToHex(
          toBytes("0x" + externalTokenAddress.slice(-40), {
            size: 20,
          })
        ), // 0x + 20 bytes
        amountToSend: amountToSend,
        feeAmount: feeAmount,
        chainFrom: networkFrom,
        chainTo: networkTo,
        timestamp: timestamp,
        flags: flags,
        flagData: flagData
          ? bytesToHex(Buffer.from(flagData.slice(2), "hex"))
          : "",
      };
      signResult = await this.signSvmSendPayload(sendPayload);
    } else {
      sendPayload = SendPayload.parse({
        chainFrom: networkFrom,
        chainTo: networkTo,
        tokenAddressFrom: tokenAddress,
        tokenAddressTo: externalTokenAddress,
        amountToSend,
        feeAmount,
        timestamp,
        flags,
        flagData,
      });
      signResult = await this.signEvmSendPayload(sendPayload);
    }

    return {
      sendPayload,
      ...signResult,
    };
  }

  async signEvmSendPayload(
    sendPayload: SendPayload
  ): Promise<{ signature: Hex; signedBy: string }> {
    const payload = encodePacked(
      [
        "uint256",
        "uint256",
        "bytes32",
        "bytes32",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes",
      ],
      [
        sendPayload.chainFrom,
        sendPayload.chainTo,
        sendPayload.tokenAddressFrom as `0x${string}`,
        sendPayload.tokenAddressTo as `0x${string}`,
        sendPayload.amountToSend,
        sendPayload.feeAmount,
        BigInt(sendPayload.timestamp),
        sendPayload.flags,
        sendPayload.flagData as `0x${string}`,
      ]
    );
    const payloadHash = keccak256(payload);
    return {
      signature: await this.evmSigner.signMessage({
        message: { raw: payloadHash },
      }),
      signedBy: this.evmSigner.address,
    };
  }

  async signSvmSendPayload(
    sendPayload: SendPayload
  ): Promise<{ signature: Hex; signedBy: string }> {
    const sendPayloadToSerialize: SolanaSendPayloadSerialize =
      SolanaSendPayloadSerialize.parse({
        tokenAddressFrom: toBytes(sendPayload.tokenAddressFrom),
        tokenAddressTo: toBytes(sendPayload.tokenAddressTo),
        amountToSend: sendPayload.amountToSend,
        feeAmount: sendPayload.feeAmount,
        chainFrom: sendPayload.chainFrom,
        chainTo: sendPayload.chainTo,
        timestamp: BigInt(sendPayload.timestamp),
        flags: toBytes(sendPayload.flags, { size: 32 }),
        flagData:
          sendPayload.flagData === ""
            ? new Uint8Array(0)
            : toBytes(sendPayload.flagData),
      });
    const serializedPayload = serializeSendPayload(sendPayloadToSerialize);
    const signature = nacl.sign.detached(
      serializedPayload,
      this.solanaSigner.secretKey
    );
    return {
      signature: bytesToHex(signature),
      signedBy: this.solanaSigner.publicKey.toBase58(),
    };
  }
}
