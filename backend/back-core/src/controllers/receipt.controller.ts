import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { receipt, signatures } from "../db/schema/core.schema";
import { receiptsMetaInIndexerEvm } from "../db/schema/evm.schema";
import { receiptsMetaInIndexerSolana } from "../db/schema/solana.schema";
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
  webSocket,
} from "viem";
import { bridgeAbi } from "../../abis/bridgeAbi";
import { getContext } from "hono/context-storage";
import { validatorAbi } from "../../abis/validatorAbi";
import { consoleLogger } from "../utils";

const SOLANA_CHAIN_ID = bytesToBigInt(stringToBytes("SOLANA", { size: 8 }));
const SOLANA_DEV_CHAIN_ID = bytesToBigInt(stringToBytes("SOLANADN", { size: 8 }));

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
      consoleLogger(
        "Error selecting receipts",
        (error as unknown as Error).toString()
      );
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
  ): Promise<
    | Array<{
        receipts: typeof receipt.$inferSelect;
        receiptsMeta:
          | typeof receiptsMetaInIndexerEvm.$inferSelect
          | typeof receiptsMetaInIndexerSolana.$inferSelect
          | null;
      }>
    | Error
  > {
    const signedByRelayer = await this.db
      .select({ receiptId: signatures.receiptId })
      .from(signatures)
      .where(eq(signatures.signedBy, pubkey));
    const joinModel =
      chainEnum === "svm"
        ? receiptsMetaInIndexerEvm
        : receiptsMetaInIndexerSolana;
    const receipts = await this.db
      .select()
      .from(receipt)
      .where(
        and(
          eq(receipt.claimed, false),
          chainEnum === "svm"
            ? or(
                eq(
                  receipt.chainTo,
                  SOLANA_CHAIN_ID.toString()
                ),
                eq(
                  receipt.chainTo,
                  SOLANA_DEV_CHAIN_ID.toString()
                )
              )
            : and(
                ne(
                  receipt.chainTo,
                  SOLANA_CHAIN_ID.toString()
                ),
                ne(
                  receipt.chainTo,
                  SOLANA_DEV_CHAIN_ID.toString()
                )
              ),
          notInArray(
            receipt.receiptId,
            signedByRelayer.map((r) => r.receiptId)
          )
        )
      )
      .leftJoin(joinModel, eq(receipt.receiptId, joinModel.receiptId));
    return receipts;
  }

  private async checkSignerEVM(
    receiptToSign: typeof receipt.$inferSelect,
    signature: `0x${string}`
  ): Promise<`0x${string}`> {
    const MiniReceiptAbi = bridgeAbi.find(
      (abi) =>
        abi.type === "function" &&
        abi.name === "claim" &&
        abi.inputs[0].internalType.includes("MiniReceipt")
    )?.inputs[0];
    if (!MiniReceiptAbi) throw new Error("Receipt ABI not found");
    const message = encodeAbiParameters(MiniReceiptAbi.components, [
      receiptToSign.to as `0x${string}`,
      receiptToSign.tokenAddressTo as `0x${string}`,
      BigInt(receiptToSign.amountTo),
      BigInt(receiptToSign.chainFrom),
      BigInt(receiptToSign.chainTo),
      BigInt(receiptToSign.eventId),
      BigInt(receiptToSign.flags),
      receiptToSign.data as `0x${string}`,
    ]);
    const messageHash = keccak256(message);
    const digest = hashMessage({ raw: messageHash });
    const signer = await recoverMessageAddress({ message: digest, signature });
    if (
      Object.hasOwn(getContext().env as object, `RPC_NODE_${receipt.chainTo}`)
    ) {
      const nodeURL = getContext().env[`RPC_NODE_${receipt.chainTo}`] as string;
      const client = createPublicClient({
        transport: nodeURL.startsWith("ws")
          ? webSocket(nodeURL)
          : http(nodeURL),
      });
      const validatorAddress = await client.readContract({
        abi: bridgeAbi,
        address: receiptToSign.bridgeAddress as `0x${string}`,
        functionName: "validator",
        args: [],
      });
      const isValidator = await client.readContract({
        abi: validatorAbi,
        address: validatorAddress,
        functionName: "isValidator",
        args: [signer],
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
    switch (BigInt(receiptToSign.chainTo)) {
      case SOLANA_CHAIN_ID:
      case SOLANA_DEV_CHAIN_ID:
        // TODO: Implement Solana signature verification
        throw new Error("Solana signature verification not implemented");
      default:
        const validSigner = await this.checkSignerEVM(receiptToSign, signature);
        if (!validSigner) {
          throw new Error("Invalid signer");
        }
        await this.db.insert(signatures).values({
          receiptId,
          signedBy: validSigner,
          signature,
        });
        return true;
    }
  }
}
