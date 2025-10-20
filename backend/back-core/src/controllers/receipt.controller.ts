import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { receipt, signatures } from "../db/schema/core.schema";
import { receiptsMetaInIndexerEvm } from "../db/schema/evm.schema";
import { receiptsMetaInIndexerSolana } from "../db/schema/solana.schema";
import {
  eq,
  or,
  asc,
  desc,
  ne,
  and,
  notInArray,
  inArray,
  count
} from "drizzle-orm";
import { toBytes, keccak256, recoverMessageAddress, encodePacked } from "viem";
import { consoleLogger } from "../utils";
import { serializeReceivePayload, ReceivePayload } from "../utils/solana";
import {
  bridgeValidators,
  SOLANA_CHAIN_ID,
  SOLANA_DEV_CHAIN_ID,
  stageConfig,
  tokensConfig, WAIT_TIME_SEC
} from "../../config";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { Networks } from "../utils/networks";

export class ReceiptController {
  db: NodePgDatabase;

  constructor(dbUrl: string) {
    this.db = drizzle(dbUrl);
  }

  async getAllReceipts(
    limit: number = 50,
    offset: number = 0,
    ordering: "asc" | "desc" = "desc",
    userAddress?: string,
    chainFrom?: bigint,
    chainTo?: bigint
  ): Promise<{
    data: Array<{
      receipt: typeof receipt.$inferSelect & {
        signaturesRequired: number;
      };
      receiptMeta: Array<
        | typeof receiptsMetaInIndexerEvm.$inferSelect
        | typeof receiptsMetaInIndexerSolana.$inferSelect
      >;
    }>;
    pagination: {
      total: number;
      totalPages: number;
      page: number;
      hasNextPage: boolean;
    };
  }> {
    try {
      await this.db.refreshMaterializedView(receipt);
      const filterStage = inArray(
        receipt.bridgeAddress,
        [
          ...Object.values(stageConfig.contracts).map(c => c.startsWith("0x") ? c.toLowerCase() : c),
          ...Object.values(tokensConfig.bridges).flatMap(network =>
            Object.values(network as Record<string, string>).map(addr =>
              addr.startsWith("0x") ? addr.toLowerCase() : addr
            )
          )
        ]
      );
      const filterUser = userAddress
        ? or(
          eq(receipt.to, userAddress.toLowerCase()),
          eq(receipt.from, userAddress.toLowerCase())
        )
        : undefined;
      const filterChainFrom = chainFrom
        ? eq(receipt.chainFrom, chainFrom.toString())
        : inArray(receipt.chainFrom, Object.keys(bridgeValidators));
      const filterChainTo = chainTo
        ? eq(receipt.chainTo, chainTo.toString())
        : inArray(receipt.chainTo, Object.keys(bridgeValidators));

      const result = await this.db
        .select()
        .from(receipt)
        .where(and(filterUser, filterChainFrom, filterChainTo, filterStage))
        .orderBy(
          ordering === "asc" ? asc(receipt.timestamp) : desc(receipt.timestamp)
        )
        .limit(limit)
        .offset(offset);

      const [{ count: totalCount }] = await this.db
        .select({ count: count() })
        .from(receipt)
        .where(and(filterUser, filterChainFrom, filterChainTo, filterStage));
      const metasEvm = await this.db
        .select({
          receiptId: receiptsMetaInIndexerEvm.receiptId,
          eventChain: receiptsMetaInIndexerEvm.eventChain,
          blockHash: receiptsMetaInIndexerEvm.blockHash,
          blockNumber: receiptsMetaInIndexerEvm.blockNumber,
          timestamp: receiptsMetaInIndexerEvm.timestamp,
          transactionHash: receiptsMetaInIndexerEvm.transactionHash,
          transactionIndex: receiptsMetaInIndexerEvm.transactionIndex
        })
        .from(receiptsMetaInIndexerEvm)
        .where(
          inArray(
            receiptsMetaInIndexerEvm.receiptId,
            result.map((r) => r.receiptId)
          )
        );
      const metasSolana = await this.db
        .select({
          receiptId: receiptsMetaInIndexerSolana.receiptId,
          eventChain: receiptsMetaInIndexerSolana.eventChain,
          blockHash: receiptsMetaInIndexerSolana.blockHash,
          blockNumber: receiptsMetaInIndexerSolana.blockNumber,
          timestamp: receiptsMetaInIndexerSolana.timestamp,
          transactionHash: receiptsMetaInIndexerSolana.transactionHash,
          transactionIndex: receiptsMetaInIndexerSolana.transactionIndex
        })
        .from(receiptsMetaInIndexerSolana)
        .where(
          inArray(
            receiptsMetaInIndexerSolana.receiptId,
            result.map((r) => r.receiptId)
          )
        );
      return {
        data: result.map((r) => {
          const metaEvm = metasEvm.filter((m) => m.receiptId === r.receiptId);
          const metaSolana = metasSolana.filter(
            (m) => m.receiptId === r.receiptId
          );
          return {
            receipt: {
              ...r,
              signaturesRequired: bridgeValidators[r.chainTo].length
            },
            receiptMeta: [...metaEvm, ...metaSolana]
          };
        }),
        pagination: {
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          page: Math.floor(offset / limit) + 1,
          hasNextPage:
            Math.floor(offset / limit) + 1 < Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      consoleLogger(
        "Error selecting receipts",
        (error as unknown as Error).toString()
      );
      consoleLogger((error as Error).stack as string);
      throw error as Error;
    }
  }

  async getReceiptIdByTransactionHash(
    transactionHash: string
  ): Promise<string | null> {
    try {
      const metaEvm = await this.db
        .select({ receiptId: receiptsMetaInIndexerEvm.receiptId })
        .from(receiptsMetaInIndexerEvm)
        .where(
          eq(
            receiptsMetaInIndexerEvm.transactionHash,
            transactionHash.toLowerCase()
          )
        )
        .limit(1);

      if (metaEvm.length > 0) {
        return metaEvm[0].receiptId;
      }

      const metaSolana = await this.db
        .select({ receiptId: receiptsMetaInIndexerSolana.receiptId })
        .from(receiptsMetaInIndexerSolana)
        .where(eq(receiptsMetaInIndexerSolana.transactionHash, transactionHash))
        .limit(1);

      if (metaSolana.length > 0) {
        return metaSolana[0].receiptId;
      }
      return null;
    } catch (error) {
      consoleLogger(
        "Error retrieving receiptId by transactionHash",
        (error as unknown as Error).toString()
      );
      consoleLogger((error as Error).stack as string);
      throw error as Error;
    }
  }

  async getReceipt(receiptId: `${number}_${number}_${number}`): Promise<{
    receipt: typeof receipt.$inferSelect & {
      signaturesRequired: number;
      canClaimAt: number;
      canClaimNow: boolean;
    };
    receiptMeta: Array<
      | typeof receiptsMetaInIndexerEvm.$inferSelect
      | typeof receiptsMetaInIndexerSolana.$inferSelect
    >;
  }> {
    try {
      await this.db.refreshMaterializedView(receipt);
      const metaEvm = await this.db
        .select({
          receiptId: receiptsMetaInIndexerEvm.receiptId,
          eventChain: receiptsMetaInIndexerEvm.eventChain,
          blockHash: receiptsMetaInIndexerEvm.blockHash,
          blockNumber: receiptsMetaInIndexerEvm.blockNumber,
          timestamp: receiptsMetaInIndexerEvm.timestamp,
          transactionHash: receiptsMetaInIndexerEvm.transactionHash,
          transactionIndex: receiptsMetaInIndexerEvm.transactionIndex
        })
        .from(receiptsMetaInIndexerEvm)
        .where(eq(receiptsMetaInIndexerEvm.receiptId, receiptId));
      const metaSolana = await this.db
        .select({
          receiptId: receiptsMetaInIndexerSolana.receiptId,
          eventChain: receiptsMetaInIndexerSolana.eventChain,
          blockHash: receiptsMetaInIndexerSolana.blockHash,
          blockNumber: receiptsMetaInIndexerSolana.blockNumber,
          timestamp: receiptsMetaInIndexerSolana.timestamp,
          transactionHash: receiptsMetaInIndexerSolana.transactionHash,
          transactionIndex: receiptsMetaInIndexerSolana.transactionIndex
        })
        .from(receiptsMetaInIndexerSolana)
        .where(eq(receiptsMetaInIndexerSolana.receiptId, receiptId));
      const [result] = await this.db
        .select()
        .from(receipt)
        .where(
          and(
            eq(receipt.receiptId, receiptId),
            inArray(receipt.chainFrom, Object.keys(bridgeValidators)),
            inArray(receipt.chainTo, Object.keys(bridgeValidators))
          )
        );
      if (!Object.keys(bridgeValidators).includes(result.chainFrom))
        throw new Error("Receipt chainFrom not supported");
      if (!Object.keys(bridgeValidators).includes(result.chainTo))
        throw new Error("Receipt chainTo not supported");

      const canClaimAt = Number(result.timestamp) + WAIT_TIME_SEC;
      const canClaimNow = Math.floor(Date.now() / 1000) >= canClaimAt;

      return {
        receipt: {
          ...result,
          signaturesRequired: bridgeValidators[result.chainTo].length,
          canClaimAt,
          canClaimNow,
        },
        receiptMeta: [...metaEvm, ...metaSolana]
      };
    } catch (error) {
      consoleLogger(
        "Error selecting receipt",
        (error as unknown as Error).toString()
      );
      consoleLogger((error as Error).stack as string);
      throw error as Error;
    }
  }

  async getReceiptSignatures(
    receiptId: `${number}_${number}_${number}`
  ): Promise<Array<Omit<typeof signatures.$inferSelect, "id" | "receiptId">>> {
    try {
      await this.db.refreshMaterializedView(receipt);
      const signaturesData = await this.db
        .select({
          signedBy: signatures.signedBy,
          signature: signatures.signature
        })
        .from(signatures)
        .where(eq(signatures.receiptId, receiptId))
        .orderBy(asc(signatures.signedBy));
      return signaturesData;
    } catch (error) {
      consoleLogger(
        "Error selecting receipt signatures",
        (error as unknown as Error).toString()
      );
      consoleLogger((error as Error).stack as string);
      throw error as Error;
    }
  }

  async getUnsignedReceipts(
    pubkey: string,
    chainEnum: "evm" | "svm"
  ): Promise<
    Array<{
      receipts: typeof receipt.$inferSelect & {
        signaturesRequired: number;
      };
      receiptsMeta:
        | typeof receiptsMetaInIndexerEvm.$inferSelect
        | typeof receiptsMetaInIndexerSolana.$inferSelect
        | null;
    }>
  > {
    await this.db.refreshMaterializedView(receipt);
    const joinModel =
      chainEnum === "svm"
        ? receiptsMetaInIndexerEvm
        : receiptsMetaInIndexerSolana;
    const signerNetworks = Object.entries(bridgeValidators)
      .filter(([_, keys]) =>
        keys.map((k) => k.toLowerCase()).includes(pubkey.toLowerCase())
      )
      .map(([net, _]) => net);
    const receipts = await this.db
      .select()
      .from(receipt)
      .where(
        and(
          or(
            inArray(receipt.chainFrom, signerNetworks),
            inArray(receipt.chainTo, signerNetworks)
          ),
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
            this.db
              .select({ receiptId: signatures.receiptId })
              .from(signatures)
              .where(eq(signatures.signedBy, pubkey))
          )
        )
      )
      .leftJoin(joinModel, eq(receipt.receiptId, joinModel.receiptId));
    return receipts.map((r) => ({
      receipts: {
        ...r.receipts,
        signaturesRequired: bridgeValidators[r.receipts.chainTo].length
      },
      receiptsMeta: r.receiptsMeta
    }));
  }

  hashedMsgEVM(receiptToSign: typeof receipt.$inferSelect): `0x${string}` {
    const message = encodePacked(
      [
        "bytes32",
        "bytes32",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes"
      ],
      [
        receiptToSign.to as `0x${string}`,
        receiptToSign.tokenAddressTo as `0x${string}`,
        BigInt(receiptToSign.amountTo),
        BigInt(receiptToSign.chainFrom),
        BigInt(receiptToSign.chainTo),
        BigInt(receiptToSign.eventId),
        BigInt(receiptToSign.flags) >> 65n,
        receiptToSign.data as `0x${string}`
      ]
    );
    const messageHash = keccak256(message);
    return messageHash;
  }

  hashedMsgSolana(receiptToSign: typeof receipt.$inferSelect): `0x${string}` {
    const value: ReceivePayload = ReceivePayload.parse({
      to: toBytes(receiptToSign.to, { size: 32 }),
      tokenAddressTo: toBytes(receiptToSign.tokenAddressTo, { size: 32 }),
      amountTo: BigInt(receiptToSign.amountTo),
      chainFrom: BigInt(receiptToSign.chainFrom),
      chainTo: BigInt(receiptToSign.chainTo),
      eventId: BigInt(receiptToSign.eventId),
      flags: toBytes(BigInt(receiptToSign.flags), { size: 32 }),
      flagData: toBytes(receiptToSign.data)
    });
    const payload = serializeReceivePayload(value);
    const messageHash = keccak256(payload);
    return messageHash;
  }

  private async checkSignerEVM(
    receiptToSign: typeof receipt.$inferSelect,
    signer: `0x${string}`,
    signature: `0x${string}`
  ): Promise<`0x${string}`> {
    const messageHash = this.hashedMsgEVM(receiptToSign);
    const signerRecovered = await recoverMessageAddress({
      message: { raw: messageHash },
      signature
    });

    if (signerRecovered !== signer) throw new Error("Invalid signature");
    const validators = bridgeValidators[receiptToSign.chainTo];
    if (validators.length === 0) throw new Error("Validators not found");
    if (!validators.includes(signer)) throw Error("Signer is not a validator");
    return signer;
  }

  private async checkSignerSolana(
    receiptToSign: typeof receipt.$inferSelect,
    signer: string,
    signature: `0x${string}`
  ): Promise<string> {
    const messageHash = toBytes(this.hashedMsgSolana(receiptToSign));
    const signatureBytes = toBytes(signature);
    const isValid = nacl.sign.detached.verify(
      messageHash,
      signatureBytes,
      new PublicKey(signer).toBytes()
    );
    if (!isValid) throw new Error("Invalid signature");

    const validators = bridgeValidators[receiptToSign.chainTo];
    if (validators.length === 0) throw new Error("Validators not found");
    if (!validators.includes(signer)) throw Error("Signer is not a validator");

    return signer;
  }

  async addSignature(
    receiptId: `${number}_${number}_${number}`,
    signer: string,
    signature: `0x${string}`
  ): Promise<boolean> {
    await this.db.refreshMaterializedView(receipt);
    const [receiptToSign] = await this.db
      .select()
      .from(receipt)
      .where(eq(receipt.receiptId, receiptId));

    if (!receiptToSign) throw new Error("Receipt not found");
    if (receiptToSign.claimed) throw new Error("Receipt already claimed");

    let signedBy: string;
    if (Networks.isSolana(BigInt(receiptToSign.chainTo))) {
      signedBy = await this.checkSignerSolana(receiptToSign, signer, signature);
    } else {
      signedBy = await this.checkSignerEVM(
        receiptToSign,
        signer as `0x${string}`,
        signature
      );
    }

    await this.db.insert(signatures).values({ receiptId, signedBy, signature });
    return true;
  }
}
