/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */
import { stringToBytes, bytesToBigInt } from "viem";
import { config } from "./config";
import {
  type ReceiptsToSignResponse,
  type FullReceiptDB,
  type ReceiptWithMeta,
} from "./typeValidators";
import { signReceiptForEVM } from "./evm/sign";
import { signReceiptForSolana } from "./solana/sign";
import { getUnsignedTransactionsEVM } from "./evm/getUnsigned";
import { getUnsignedTransactionsSolana } from "./solana/getUnsigned";

async function getUnsignedTransactions(): Promise<ReceiptsToSignResponse> {
  // maybe needs just to merge both responses
  const evmTransactions = await getUnsignedTransactionsEVM();
  const solanaTransactions = await getUnsignedTransactionsSolana();
  return [...evmTransactions, ...solanaTransactions];
}

async function signReceipt(
  receiptWithMeta: ReceiptWithMeta
): Promise<`0x${string}` | undefined> {
  switch (receiptWithMeta.receipts.chainTo) {
    case bytesToBigInt(stringToBytes("SOLANA", { size: 8 })): // Solana signature needed
    case bytesToBigInt(stringToBytes("SOLANADN", { size: 8 })): // Solana signature needed
      return await signReceiptForSolana(receiptWithMeta);
    default:
      return await signReceiptForEVM(receiptWithMeta);
  }
}

async function postSignature(
  receiptId: FullReceiptDB["receiptId"],
  signer: string,
  signature: string
) {
  try {
    const response = await fetch(
      `${config.BACKEND_URL}/api/receipts/${receiptId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer,
          signature
         }),
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
      let signer = null;
      switch (transaction.receipts.chainTo) {
        case bytesToBigInt(stringToBytes("SOLANA", { size: 8 })): 
        case bytesToBigInt(stringToBytes("SOLANADN", { size: 8 })):
          signer = config.accountSolana.publicKey.toBase58();
          break;
        default:
          signer = config.accountEVM.address;
          break;
      }
      const signature = await signReceipt(transaction);
      if (signature) {
        await postSignature(transaction.receipts.receiptId, signer, signature);
      }
    }
    console.log(`Processed ${transactions.length} transactions.`);
  } catch (error) {
    console.error("Error processing transactions:", error);
  }
}

async function startRelayService() {
  console.log("Using EVM account:", config.accountEVM.address);
  console.log(
    "Using Solana account:",
    config.accountSolana.publicKey.toBase58()
  );
  while (true) {
    await processTransactions();
    await new Promise((resolve) =>
      setTimeout(resolve, config.POLLING_INTERVAL)
    );
  }
}

startRelayService().catch(console.error);
