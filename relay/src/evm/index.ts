/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */
import {
  http,
  stringToBytes,
  bytesToBigInt,
  createPublicClient,
  encodeAbiParameters,
  decodeAbiParameters,
  keccak256,
  hashMessage,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { bridgeAbi } from "./abis/bridgeAbi";
import {
  config,
  rpcConfig,
  validators,
  type FullReceiptDB,
  type ReceiptsToSignResponse,
  type ReceiptWithMeta,
} from "./validators";

const account = mnemonicToAccount(config.MNEMONIC);

async function getUnsignedTransactions(): Promise<ReceiptsToSignResponse> {
  try {
    const response = await fetch(
      `${config.BACKEND_URL}/evm/unsigned/${account.address}`
    );
    if (response.ok) {
      const data = await response.json();
      const receipts = validators.ReceiptsToSignResponse.parse(data);
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

async function validateExistingTransaction(
  receiptWithMeta: ReceiptWithMeta
): Promise<void> {
  const receiptMeta = receiptWithMeta.receiptsMeta;
  if (!receiptMeta) {
    throw new Error("Receipt metadata is required for validation.");
  }
  const publicClient = createPublicClient({
    transport: http(rpcConfig[`RPC_URL_${receiptWithMeta.receipts.chainFrom}`]),
  });
  const receipt = await publicClient.getTransactionReceipt({
    hash: receiptMeta.transactionHash,
  });
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
  const ReceiptAbi = bridgeAbi.find(
    (abi) => abi.type === "event" && abi.name === "TokenLocked"
  )?.inputs;
  if (!ReceiptAbi) throw new Error("Receipt ABI not found");
  const parsedLog = decodeAbiParameters(ReceiptAbi, logFound.data);

  if (
    parsedLog[0].to !== receiptWithMeta.receipts.to ||
    parsedLog[0].tokenAddressTo !== receiptWithMeta.receipts.tokenAddressTo ||
    parsedLog[0].amountTo !== receiptWithMeta.receipts.amountTo ||
    parsedLog[0].chainFrom !== receiptWithMeta.receipts.chainFrom ||
    parsedLog[0].chainTo !== receiptWithMeta.receipts.chainTo ||
    parsedLog[0].eventId !== receiptWithMeta.receipts.eventId ||
    parsedLog[0].flags !== receiptWithMeta.receipts.flags ||
    parsedLog[0].data !== receiptWithMeta.receipts.data
  ) {
    throw new Error(
      `Log data does not match receipt for transaction hash ${receiptMeta.transactionHash}.`
    );
  }
  console.log(`Transaction ${receiptMeta.transactionHash} is valid.`);
}

async function signReceiptForEVM(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  try {
    await validateExistingTransaction(receiptWithMeta);
  } catch (error) {
    console.error("Error validating transaction:", error);
    return;
  }
  const receipt = receiptWithMeta.receipts;
  const MiniReceiptAbi = bridgeAbi.find(
    (abi) => abi.type === "function" && abi.name === "claim"
  )?.inputs[0];
  if (!MiniReceiptAbi) throw new Error("Receipt ABI not found");
  const message = encodeAbiParameters(MiniReceiptAbi.components, [
    receipt.to as `0x${string}`,
    receipt.tokenAddressTo as `0x${string}`,
    BigInt(receipt.amountTo),
    BigInt(receipt.chainFrom),
    BigInt(receipt.chainTo),
    BigInt(receipt.eventId),
    BigInt(receipt.flags),
    receipt.data as `0x${string}`,
  ]);

  const messageHash = keccak256(message);
  const digest = hashMessage({ raw: messageHash });
  const signature = await account.signMessage({ message: digest });
  return signature;
}

async function signReceiptForSolana(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  throw new Error("Solana signing not implemented.");
}

async function signReceipt(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  switch (receiptWithMeta.receipts.chainTo) {
    case bytesToBigInt(stringToBytes("SOLANA", { size: 32 })): // Solana signature needed
      return await signReceiptForSolana(receiptWithMeta);
    default:
      return await signReceiptForEVM(receiptWithMeta);
  }
}

async function postSignature(
  receiptId: FullReceiptDB["receiptId"],
  signature: string
) {
  try {
    const response = await fetch(
      `${config.BACKEND_URL}/api/receipts/${receiptId}`,
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
    console.log(`Processed ${transactions.length} transactions.`);
  } catch (error) {
    console.error("Error processing transactions:", error);
  }
}

async function startRelayService() {
  while (true) {
    await processTransactions();
    await new Promise((resolve) =>
      setTimeout(resolve, config.POLLING_INTERVAL)
    );
  }
}

startRelayService().catch(console.error);
