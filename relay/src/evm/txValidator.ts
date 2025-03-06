import { createPublicClient, decodeAbiParameters, http, keccak256 } from "viem";
import { config } from "../config";
import { type ReceiptMeta, type ReceiptWithMeta } from "../typeValidators";

export async function validateExistingTransactionEVM(
  receiptWithMeta: ReceiptWithMeta
): Promise<void> {
  const receiptMeta: ReceiptMeta | undefined = receiptWithMeta.receiptsMeta as
    | ReceiptMeta
    | undefined;
  if (!receiptMeta) {
    throw new Error("Receipt metadata is required for validation.");
  }
  const rpcFrom =
    config.rpcConfig[`RPC_URL_${receiptWithMeta.receipts.chainFrom}`] as string;
  if (!rpcFrom) {
    throw new Error(
      `RPC URL for chain ${receiptWithMeta.receipts.chainFrom} not found.`
    );
  }
  const publicClient = createPublicClient({
    transport: http(rpcFrom),
  });
  const receipt = await publicClient.getTransactionReceipt({
    hash: receiptMeta.transactionHash as `0x${string}`,
  });
  if (!receipt) {
    throw new Error(
      `Receipt for transaction hash ${receiptMeta.transactionHash} not found.`
    );
  }

  const logFound = receipt.logs.find(
    (log) =>
      log.transactionHash === receiptMeta.transactionHash &&
      log.topics[0] ===
        keccak256(
          Buffer.from(
            "TokenLocked((bytes32,bytes32,bytes32,bytes32,uint256,uint256,uint256,uint256,uint256,uint256,bytes))"
          )
        )
  );
  if (!logFound) {
    throw new Error(
      `Event log for transaction hash ${receiptMeta.transactionHash} not found.`
    );
  }
  console.log(logFound);
  const ReceiptAbi = {
    name: "receipt",
    type: "tuple",
    indexed: false,
    internalType: "struct BridgeTypes.FullReceipt",
    components: [
      {
        name: "from",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "to",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "tokenAddressFrom",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "tokenAddressTo",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "amountFrom",
        type: "uint256",
        internalType: "uint256",
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
  console.log(logFound.data);
  const parsedLog = decodeAbiParameters(
    [ReceiptAbi],
    logFound.data
  ) as readonly [
    {
      from: `0x${string}`;
      to: `0x${string}`;
      tokenAddressTo: `0x${string}`;
      tokenAddressFrom: `0x${string}`;
      amountFrom: bigint;
      amountTo: bigint;
      chainFrom: bigint;
      chainTo: bigint;
      eventId: bigint;
      flags: bigint;
      data: `0x${string}` | "" | null;
    }
  ];
  console.log(parsedLog);
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

export default validateExistingTransactionEVM;
