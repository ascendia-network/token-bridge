/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */
import { ethers } from "ethers";
import { z } from "zod";
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

const config = {
  evmApiUrl: process.env.EVM_RPC || "https://network.ambrosus-test.io",
  coreBackendUrl: process.env.BACKEND_URL || "http://localhost:3000",
  evmPrivateKey: process.env.EVM_PRIVATE_KEY!,
  pollingInterval: process.env.POLLING_INTERVAL ? Number.parseInt(process.env.POLLING_INTERVAL) : 5000, // 5 seconds
};

const MiniReceipt = z.object({
  to: z.string().regex(/0x[0-9a-fA-F]{64}/),
  tokenAddressTo: z.string().regex(/0x[0-9a-fA-F]{64}/),
  amountTo: z.bigint(),
  chainFrom: z.bigint(),
  chainTo: z.bigint(),
  eventId: z.bigint(),
  flags: z.bigint(),
  data: z.string().regex(/0x[0-9a-fA-F]*/),
});

const FullReceipt = MiniReceipt.extend({
  from: z.string().regex(/0x[0-9a-fA-F]{64}/),
  tokenAddressFrom: z.string().regex(/0x[0-9a-fA-F]{64}/),
  amountFrom: z.bigint(),
})

const ReceiptMeta = z.object({
  receiptId: z.string().regex(/[0-9]+_[0-9]+_[0-9]+/),
  blockHash: z.string().nullable(),
  blockNumber: z.bigint(),
  timestamp: z.bigint(),
  transactionHash: z.string(),
  transactionIndex: z.number(),
});

const FullReceiptDB = FullReceipt.extend({
  receiptId: z.string().regex(/[0-9]+_[0-9]+_[0-9]+/),
  timestamp: z.bigint(),
  bridgeAddress: z.string(),
});

const MiniReceiptDB = MiniReceipt.extend({
  receiptId: z.string().regex(/[0-9]+_[0-9]+_[0-9]+/),
  timestamp: z.bigint(),
  bridgeAddress: z.string(),
});

const ReceiptWithMeta = z.object({
  receipts: FullReceiptDB,
  receiptsMeta: ReceiptMeta.nullable(),
})

const ReceiptsToSignResponse = z.array(ReceiptWithMeta);

const provider = new ethers.JsonRpcProvider(config.evmApiUrl);
const wallet = new ethers.Wallet(config.evmPrivateKey, provider);

async function getUnsignedTransactions(): Promise<z.infer<typeof ReceiptsToSignResponse>> {
  try {
    const response = await fetch(
      `${config.coreBackendUrl}/evm/unsigned/${wallet.address}`
    );
    if (response.ok) {
      const data = await response.json();
      const receipts = ReceiptsToSignResponse.parse(data);
      return receipts;
    } else {
      console.error(
        "Failed to fetch unsigned transactions:",
        await response.text()
      );
      return [];
    }
  } catch (error) {
    console.error("Error fetching unsigned transactions:", error);
    return [];
  }
}

async function validateExistingTransaction(receiptWithMeta: z.infer<typeof ReceiptWithMeta>) {
  const receiptMeta = receiptWithMeta.receiptsMeta;
  if (!receiptMeta) {
    throw new Error("Receipt metadata is required for validation.");
  }
  const transaction = await provider.getTransaction(
    receiptMeta.transactionHash
  );
  if (!transaction) {
    throw new Error(
      `Transaction with hash ${receiptMeta.transactionHash} not found.`
    );
  }
  const receipt = await provider.getTransactionReceipt(
    receiptMeta.transactionHash
  );
  if (!receipt) {
    throw new Error(
      `Receipt for transaction hash ${receiptMeta.transactionHash} not found.`
    );
  }

  const logFound = receipt.logs.find(
    (log) => log.transactionHash === receiptMeta.transactionHash
  );
  if (!logFound) {
    throw new Error(
      `Event log for transaction hash ${receiptMeta.transactionHash} not found.`
    );
  }
  const parsedLog = ethers.AbiCoder.defaultAbiCoder().decode(
    [
      "address",
      "address",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "bytes",
    ],
    logFound.data
  );

  if (
    parsedLog[0] !== receiptWithMeta.receipts.to ||
    parsedLog[1] !== receiptWithMeta.receipts.tokenAddressTo ||
    parsedLog[2].toString() !== receiptWithMeta.receipts.amountTo.toString() ||
    parsedLog[3].toString() !== receiptWithMeta.receipts.chainFrom.toString() ||
    parsedLog[4].toString() !== receiptWithMeta.receipts.chainTo.toString() ||
    parsedLog[5].toString() !== receiptWithMeta.receipts.eventId.toString() ||
    parsedLog[6].toString() !== receiptWithMeta.receipts.flags.toString() ||
    parsedLog[7] !== receiptWithMeta.receipts.data
  ) {
    throw new Error(
      `Log data does not match receipt for transaction hash ${receiptMeta.transactionHash}.`
    );
  }
  console.log(`Transaction ${receiptMeta.transactionHash} is valid.`);
}

async function signReceipt(receiptWithMeta: z.infer<typeof ReceiptWithMeta>) {
  try {
    await validateExistingTransaction(receiptWithMeta);
  } catch (error) {
    console.error("Error validating transaction:", error);
    return;
  }
  const receipt = receiptWithMeta.receipts;
  const abiCoder = new ethers.AbiCoder();
  const encodedMessage = abiCoder.encode(
    [
      "bytes32",
      "bytes32",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "bytes",
    ],
    [
      receipt.to,
      receipt.tokenAddressTo,
      receipt.amountTo,
      receipt.chainFrom,
      receipt.chainTo,
      receipt.eventId,
      receipt.flags,
      receipt.data,
    ]
  );

  const messageHash = ethers.keccak256(encodedMessage);
  const digest = ethers.hashMessage(ethers.getBytes(messageHash));
  const signature = await wallet.signMessage(digest);
  return signature;
}

async function postSignature(receiptId: z.infer<typeof FullReceiptDB>["receiptId"], signature: string) {
  try {
    const response = await fetch(
      `${config.coreBackendUrl}/api/receipts/${receiptId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      }
    );

    if (response.ok) {
      console.log("Signature successfully sent to the backend.");
    } else {
      console.error(
        "Failed to send signature to backend:",
        await response.text()
      );
    }
  } catch (error) {
    console.error("Error sending signature to backend:", error);
  }
}

async function processTransactions() {
  try {
    const transactions = await getUnsignedTransactions();
    for (const transaction of transactions) {
      const signature = await signReceipt(transaction);
      if (signature) {
        await postSignature(transaction.receipts.receiptId, signature);
      }
    }
  } catch (error) {
    console.error("Error processing transactions:", error);
  }
}

async function startRelayService() {
  while (true) {
    await processTransactions();
    await new Promise((resolve) => setTimeout(resolve, config.pollingInterval));
  }
}

startRelayService().catch(console.error);