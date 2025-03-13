import { Connection, VersionedTransactionResponse } from "@solana/web3.js";
import { ethers } from "ethers";

export type ParsedReceipt = {
  from: string;
  to: string;
  tokenAddress: string;
  amount: string;
  chainFrom: string;
  chainTo: string;
  eventId: string;
  flags: string;
  data: any;
};

export async function getConnection(
  endpoint: string = "https://api.devnet.solana.com",
): Promise<Connection> {
  const connection = new Connection(endpoint, "finalized");
  return connection;
}

export async function getTransactionByHash(
  txHash: string,
  connection: Connection,
): Promise<VersionedTransactionResponse> {
  try {
    const tx = await connection.getTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return null;
    }
    return tx;
  } catch (error) {
    throw new Error(error);
  }
}

export async function parseLog(
  tx: VersionedTransactionResponse,
): Promise<ParsedReceipt> {
  try {
    const log = tx.meta.logMessages.find((log) => log.includes("TokenLocked"));
    const regex =
      /token=([\w]+) from=([\w]+) to=([\w]+) amount=([\d]+) chainFrom=([\w]+) chainTo=([\w]+) eventId=([\w]+) flags=([\w]+) data=(.*)/;
    const match = log.match(regex);

    if (!match) {
      throw new Error(`TokenLocked no match: ${log}`);
    }

    const receipt: ParsedReceipt = {
      tokenAddress: match[1],
      from: match[2],
      to: match[3],
      amount: match[4],
      chainFrom: match[5],
      chainTo: match[6],
      eventId: match[7],
      flags: match[8],
      data: match[9],
    };
    return receipt;
  } catch (error) {
    throw new Error(error);
  }
}

export async function signMessage(
  wallet: ethers.Wallet,
  message: string,
): Promise<string> {
  const signature = await wallet.signMessage(message);
  return signature;
}
