import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { receipt, signatures } from "../db/schema/core.schema";
import { receiptsMetaInIndexerEvm } from "../db/schema/evm.schema";
import { receiptsMetaInIndexerSolana } from "../db/schema/solana.schema";
import { eq, or, asc, desc, ne, and, notInArray } from "drizzle-orm";
import {
  stringToBytes,
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
import {
  serializeReceivePayload,
  SOLANA_CHAIN_ID,
  SOLANA_DEV_CHAIN_ID,
  type ReceivePayload,
} from "../utils/solana";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import type { Env } from "../index";

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
      consoleLogger((error as Error).stack as string);
      return error as Error;
    }
  }

  async getReceipt(
    receiptId: `${number}_${number}_${number}`
  ): Promise<typeof receipt.$inferSelect | Error> {
    try {
      consoleLogger("Refreshing materialized view...");
      await this.db.refreshMaterializedView(receipt);
      consoleLogger("Materialized view refreshed");
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
    consoleLogger("Refreshing materialized view...");
    await this.db.refreshMaterializedView(receipt);
    consoleLogger("Materialized view refreshed");
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
                eq(receipt.chainTo, SOLANA_CHAIN_ID.toString()),
                eq(receipt.chainTo, SOLANA_DEV_CHAIN_ID.toString())
              )
            : and(
                ne(receipt.chainTo, SOLANA_CHAIN_ID.toString()),
                ne(receipt.chainTo, SOLANA_DEV_CHAIN_ID.toString())
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
    const MiniReceiptAbi = {
      name: "receipt",
      type: "tuple",
      indexed: false,
      internalType: "struct BridgeTypes.MiniReceipt",
      components: [
        {
          name: "to",
          type: "bytes32",
          internalType: "bytes32",
        },
        {
          name: "tokenAddressTo",
          type: "bytes32",
          internalType: "bytes32",
        },
        {
          name: "amountTo",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "chainFrom",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "chainTo",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "eventId",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "flags",
          type: "uint256",
          internalType: "uint256",
        },
        {
          name: "data",
          type: "bytes",
          internalType: "bytes",
        },
      ],
    };
    if (!MiniReceiptAbi) throw new Error("Receipt ABI not found");
    const message = encodeAbiParameters<[typeof MiniReceiptAbi]>(
      [MiniReceiptAbi],
      [
        {
          to: receiptToSign.to as `0x${string}`,
          tokenAddressTo: receiptToSign.tokenAddressTo as `0x${string}`,
          amountTo: BigInt(receiptToSign.amountTo),
          chainFrom: BigInt(receiptToSign.chainFrom),
          chainTo: BigInt(receiptToSign.chainTo),
          eventId: BigInt(receiptToSign.eventId),
          flags: BigInt(receiptToSign.flags),
          data: receiptToSign.data as `0x${string}`,
        },
      ]
    );
    const messageHash = keccak256(message);
    const digest = hashMessage({ raw: messageHash });
    const signer = await recoverMessageAddress({ message: digest, signature });
    if (
      BigInt(receiptToSign.chainTo) === SOLANA_CHAIN_ID ||
      BigInt(receiptToSign.chainTo) === SOLANA_DEV_CHAIN_ID
    ) {
      throw new Error("Invalid chain ID");
    }
    const nodeURL =
      getContext<Env>().env[`RPC_NODE_${Number(receiptToSign.chainTo)}`];
    if (!nodeURL) throw new Error("RPC node not found");
    const client = createPublicClient({
      transport: nodeURL.startsWith("ws") ? webSocket(nodeURL) : http(nodeURL),
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
    return signer;
  }

  private async checkSignerSolana(
    receiptToSign: typeof receipt.$inferSelect,
    signer: string,
    signature: `0x${string}`
  ): Promise<string> {
    consoleLogger("Solana signature verification not implemented, skipping");
    const value: ReceivePayload = {
      to: stringToBytes(receiptToSign.to),
      tokenAddressTo: stringToBytes(receiptToSign.tokenAddressTo),
      amountTo: Number(receiptToSign.amountTo),
      chainTo: BigInt(receiptToSign.chainTo),
      flags: stringToBytes(receiptToSign.flags),
      flagData: stringToBytes(receiptToSign.data),
    };
    const payload = serializeReceivePayload(value);
    const isValid = nacl.sign.detached.verify(
      payload,
      Buffer.from(signature.slice(2), "hex"),
      new PublicKey(signer).toBytes()
    );
    if (!isValid) {
      throw new Error("Invalid signature");
    }
    // TODO: Check if signer is a validator on-chain
    return signer;
  }

  async addSignature(
    receiptId: `${number}_${number}_${number}`,
    signer: string,
    signature: `0x${string}`
  ): Promise<boolean> {
    consoleLogger("Refreshing materialized view...");
    await this.db.refreshMaterializedView(receipt);
    consoleLogger("Materialized view refreshed");
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
        consoleLogger(
          "Solana signature verification not implemented, skipping"
        );
        const signedBy = await this.checkSignerSolana(
          receiptToSign,
          signer,
          signature
        );
        await this.db.insert(signatures).values({
          receiptId,
          signedBy,
          signature,
        });
        return true;
      default:
        const validSigner = await this.checkSignerEVM(receiptToSign, signature);
        if (!validSigner || validSigner !== signer) {
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
