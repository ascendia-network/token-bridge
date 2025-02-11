import { makeSchema } from "../utils";
import { FastifyReply, FastifyRequest } from "fastify";
import { getFees } from "../../fee/fee";
import Decimal from "decimal.js";
import { ethers } from "ethers";
import { sendSignerPK } from "../../configs/config";

export const getSendSignatureSchema = makeSchema({
    networkFrom: "string",
    networkTo: "string",
    tokenAddress: "string",
    amount: "number",
    isMaxAmount: "boolean",
});

interface SendPayload {
    tokenAddress: string;
    amountToSend: string;
    feeAmount: string;
    timestamp: number;
    flags: string;
    flagData: string;
}

export async function getSendSignatureEndpoint(req: FastifyRequest, res: FastifyReply) {
    const { networkFrom, networkTo, tokenAddress, amount, isMaxAmount } = req.query as any;

    const { feeAmount, amountToSend } = await getFees(networkFrom, networkTo, tokenAddress, amount, isMaxAmount);
    const timestamp = Date.now() / 1000;
    const flags = "0x0";
    const flagData = "";

    const sendPayload: SendPayload = {
        tokenAddress,
        amountToSend,
        feeAmount,
        timestamp,
        flags,
        flagData,
    };
    const signature = signEvmSendPayload(sendPayload, sendSignerPK);

    return { sendPayload, signature };
}

async function signEvmSendPayload(sendPayload: SendPayload, sendSignerPK: string) {
    const payload = ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "uint", "uint", "uint", "uint", "bytes"],
        [
            sendPayload.tokenAddress,
            sendPayload.amountToSend,
            sendPayload.feeAmount,
            sendPayload.timestamp,
            sendPayload.flags,
            sendPayload.flagData,
        ]
    );
    const signer = new ethers.Wallet(sendSignerPK);
    return await signer.signMessage(ethers.utils.arrayify(payload));
}
