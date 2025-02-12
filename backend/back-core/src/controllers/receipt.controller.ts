import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { receipt, signatures } from "../db/schema/core.schema";
import { eq, or, asc, desc, ne, and, notInArray } from "drizzle-orm";
import {
  stringToBytes,
  bytesToBigInt,
  encodeAbiParameters,
  keccak256,
  hashMessage,
  recoverMessageAddress,
  createPublicClient,
  http,
  webSocket
} from "viem";
import { bridgeAbi } from "../../abis/bridgeAbi";
import { getContext } from "hono/context-storage";
import { validatorAbi } from "../../abis/validatorAbi";
import { consoleLogger } from "../utils";

export class ReceiptController {
  db: NodePgDatabase;

  constructor(dbUrl: string) {
    this.db = drizzle(dbUrl);
  }

  async getAllReceipts(
    limit: number = 50,
    offset: number = 0,
    ordering: "asc" | "desc" = "desc",
    userAddress?: string
  ): Promise<Array<typeof receipt.$inferSelect> | Error> {
    try {
      consoleLogger("Refreshing materialized view...");
      await this.db.refreshMaterializedView(receipt);
      consoleLogger("Materialized view refreshed");
      let baseQuery;
      if (userAddress) {
        baseQuery = this.db
          .select()
          .from(receipt)
          .where(
            or(eq(receipt.to, userAddress), eq(receipt.from, userAddress))
          );
      } else {
        baseQuery = this.db.select().from(receipt);
      }
      consoleLogger("Selecting receipts...");
      const result = await baseQuery
        .orderBy(
          ordering === "asc" ? asc(receipt.timestamp) : desc(receipt.timestamp)
        )
        .limit(limit)
        .offset(offset);
      consoleLogger("Receipts selected", result.length.toString());
      return result;
    } catch (error) {
      consoleLogger("Error selecting receipts", (error as unknown as Error).toString());
      consoleLogger(error.stack);
      return error as Error;
    }
  }

  async getReceipt(
    receiptId: `${number}-${number}-${number}`
  ): Promise<typeof receipt.$inferSelect | Error> {
    try {
      const [result] = await this.db
        .select()
        .from(receipt)
        .where(eq(receipt.receiptId, receiptId));
      return result;
    } catch (error) {
      return error as Error;
    }
  }

  async getUnsignedReceipts(
    pubkey: string,
    chainEnum: "evm" | "svm"
  ): Promise<Array<typeof receipt.$inferSelect> | Error> {
    try {
      const signedByRelayer = await this.db
        .select({ receiptId: signatures.receiptId })
        .from(signatures)
        .where(eq(signatures.signedBy, pubkey));
      const receipts = await this.db
        .select()
        .from(receipt)
        .where(
          and(
            eq(receipt.claimed, false),
            chainEnum === "svm"
              ? eq(
                receipt.chainTo,
                bytesToBigInt(
                  stringToBytes("SOLANA", { size: 32 })
                ).toString()
              )
              : ne(
                receipt.chainTo,
                bytesToBigInt(
                  stringToBytes("SOLANA", { size: 32 })
                ).toString()
              ),
            notInArray(
              receipt.receiptId,
              signedByRelayer.map((r) => r.receiptId)
            )
          )
        );
      return receipts;
    } catch (error) {
      return error as Error;
    }
  }

  private async checkSignerEVM(
    receiptToSign: typeof receipt.$inferSelect,
    signature: `0x${string}`
  ): Promise<`0x${string}`> {
    const ReceiptAbi = bridgeAbi.find(
      (abi) => abi.type === "function" && abi.name === "send"
    )?.outputs;
    if (!ReceiptAbi) throw new Error("Receipt ABI not found");
    const message = encodeAbiParameters(ReceiptAbi, [
      {
        from: receiptToSign.from as `0x${string}`,
        to: receiptToSign.to as `0x${string}`,
        tokenAddress: receiptToSign.tokenAddress as `0x${string}`,
        amount: BigInt(receiptToSign.amount),
        chainFrom: BigInt(receiptToSign.chainFrom),
        chainTo: BigInt(receiptToSign.chainTo),
        eventId: BigInt(receiptToSign.eventId),
        flags: BigInt(receiptToSign.flags),
        data: receiptToSign.data as `0x${string}`
      }
    ]);
    const messageHash = keccak256(message);
    const digest = hashMessage({ raw: messageHash });
    const signer = await recoverMessageAddress({ message: digest, signature });
    if (
      Object.hasOwn(getContext().env as object, `RPC_NODE_${receipt.chainTo}`)
    ) {
      const client = createPublicClient({
        transport: `RPC_NODE_${receipt.chainTo}`.startsWith("ws")
          ? webSocket(`RPC_NODE_${receipt.chainTo}`)
          : http(`RPC_NODE_${receipt.chainTo}`)
      });
      const validatorAddress = await client.readContract({
        abi: bridgeAbi,
        address: receiptToSign.bridgeAddress as `0x${string}`,
        functionName: "validator",
        args: []
      });
      const isValidator = await client.readContract({
        abi: validatorAbi,
        address: validatorAddress,
        functionName: "isValidator",
        args: [signer]
      });
      if (!isValidator) {
        throw Error("Signer is not a validator");
      }
    } else {
      throw Error("ChainId is not EVM chain");
    }
    return signer;
  }

  async addSignature(
    receiptId: `${number}-${number}-${number}`,
    signature: `0x${string}`
  ): Promise<boolean> {
    const [receiptToSign] = await this.db
      .select()
      .from(receipt)
      .where(eq(receipt.receiptId, receiptId));
    if (!receiptToSign) {
      throw new Error("Receipt not found");
    }
    if (receiptToSign.claimed) {
      throw new Error("Receipt already claimed");
    }
    if (
      BigInt(receiptToSign.chainTo) !==
      bytesToBigInt(stringToBytes("SOLANA", { size: 32 }))
    ) {
      const validSigner = await this.checkSignerEVM(receiptToSign, signature);
      if (!validSigner) {
        throw new Error("Invalid signer");
      }
      await this.db.insert(signatures).values({
        receiptId,
        signedBy: validSigner,
        signature
      });
      return true;
    } else {
      // TODO: Implement Solana signature verification
      throw new Error("Solana signature verification not implemented");
    }
  }
}
