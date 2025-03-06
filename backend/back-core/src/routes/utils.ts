import { z } from "zod";
import "zod-openapi/extend";
import { Base58 } from "ox";
import { receipt } from "../db/schema/core.schema";
import { receiptsMetaInIndexerEvm } from "../db/schema/evm.schema";
import { receiptsMetaInIndexerSolana } from "../db/schema/solana.schema";
import { createSelectSchema } from "drizzle-zod";
import { SOLANA_DEV_CHAIN_ID } from "../utils/solana";

export const EvmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
export const SvmAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const signatureRegex = /^(0x|0X)?[a-fA-F0-9]{128}$/;
export const receiptIdRegex = /^[0-9]+_[0-9]+_[0-9]+$/;

export const evmAddressBytes32Hex = z
  .string()
  .regex(EvmAddressRegex)
  .transform((val) => {
    const processed = String(val);
    return `0x${processed.slice(2).padStart(64, "0")}` as `0x${string}`;
  })
  .openapi({
    type: "string",
    description: "EVM address in bytes32 hex format",
    example:
      "0x000000000000000000000000C6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7"
  });

export const svmAddressBytes32Hex = z
  .string()
  .regex(SvmAddressRegex)
  .transform((val, ctx) => {
    const processed = String(val);
    const hexAddress = Base58.toHex(processed);
    if (hexAddress.length !== 64 + 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Not a valid Solana address"
      });
      // This is a special symbol you can use to
      // return early from the transform function.
      // It has type `never` so it does not affect the
      // inferred return type.
      return z.NEVER;
    }
    return hexAddress as `0x${string}`;
  })
  .openapi({
    type: "string",
    description: "Solana base58 address in bytes32 hex format",
    example:
      "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001"
  });

export const signRequestValidatorSchema = z.object({
  signature: z
    .string()
    .regex(signatureRegex)
    .transform((val) => {
      const processed = String(val);
      if (processed.startsWith("0X") || processed.startsWith("0x")) {
        return processed.slice(2);
      }
      return `0x${processed}` as `0x${string}`;
    })
});

export const evmAddressValidatorSchema = z.object({
  address: z.string().regex(EvmAddressRegex).openapi({
    type: "string",
    description: "EVM address",
    example: "0xe0b52EC5cE3e124ab5306ea42463bE85aeb5eDDd"
  })
});

export const svmAddressValidatorSchema = z.object({
  address: z.string().regex(SvmAddressRegex).openapi({
    type: "string",
    description: "Solana base58 address",
    example: "FMYR5BFh3JapZS1cfwYViiBMYJxFGwKdchnghBnBtxkk"
  })
});

export const receiptIdValidatorSchema = z.object({
  receiptId: z
    .string()
    .regex(receiptIdRegex)
    .transform((val) => val as `${number}_${number}_${number}`)
    .openapi({
      type: "string",
      description: "Receipt ID as 'chainFrom_chainTo_receiptId'",
      example: "1_22040_3"
    })
});

export const payloadValidatorSchema = z.object({
  tokenAddress: z.string().regex(/^(0x)?[a-fA-F0-9]{64}$/),
  amount: z.coerce.bigint(),
  flags: z.coerce.bigint(),
  flagData: z
    .string()
    .regex(/^(0x|0X)?[a-fA-F0-9]+$/)
    .transform((val) => {
      const processed = String(val);
      if (processed.startsWith("0X") || processed.startsWith("0x")) {
        return processed.slice(2);
      }
      return `0x${processed}` as `0x${string}`;
    })
    .optional()
});

export const payloadEvmValidatorSchema = payloadValidatorSchema.extend({
  tokenAddress: evmAddressBytes32Hex
});

export const payloadSvmValidatorSchema = payloadValidatorSchema.extend({
  tokenAddress: svmAddressBytes32Hex
});

export const sendSignatureQuerySchema = z.object({
  networkFrom: z.coerce.bigint().min(1n, "networkFrom is required").openapi({
    example: 1n,
    description: "Chain ID of the sender"
  }),
  networkTo: z.coerce.bigint().min(1n, "networkTo is required").openapi({
    example: SOLANA_DEV_CHAIN_ID,
    description: "Chain ID of the receiver"
  }),
  tokenAddress: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid token address")
    .openapi({
      example:
        "0x000000000000000000000000C6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
      description: "Token address in bytes32 hex format"
    }),
  amount: z.coerce.bigint().positive().min(1n, "amount is required").openapi({
    example: 1000000000000000000n,
    description: "Amount of tokens to send"
  }),
  isMaxAmount: z.enum(["true", "false"]).transform((val) => val === "true").default("false").openapi({
    example: false,
    description:
      "Whether to send the maximum amount of tokens (only for native tokens)"
  }),
  externalTokenAddress: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid external token address")
    .openapi({
      example:
        "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
      description: "External token address in bytes32 hex format"
    }),
  flags: z.coerce.bigint().nonnegative().default(0n).openapi({
    example: 0n,
    description: "Flags for the transaction"
  }),
  flagData: z.string().default("").openapi({
    example: "",
    description: "Data for the flags"
  })
});

// @ts-ignore
const ReceiptSchema = createSelectSchema(receipt, {
  receiptId: (schema: z.ZodString) =>
    schema.regex(receiptIdRegex).openapi({
      example: "6003100671677646000_22040_3",
      description: "Receipt ID as 'chainFrom_chainTo_eventId'",
    }),
  timestamp: (schema: z.ZodSchema) =>
    schema.openapi({
      example: "1633632000",
      description: "Timestamp of the transaction",
    }),
  bridgeAddress: z
    .union([
      z.string().regex(EvmAddressRegex),
      z.string().regex(SvmAddressRegex),
    ])
    .openapi({
      examples: [
        "0xe0b52EC5cE3e124ab5306ea42463bE85aeb5eDDd",
        "FMYR5BFh3JapZS1cfwYViiBMYJxFGwKdchnghBnBtxkk",
      ],
      description: "Bridge address",
    }),
  from: (schema: z.ZodString) =>
    schema
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .min(66)
      .max(66)
      .openapi({
        examples: [
          "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
        ],
        description: "Sender address",
      }),
  to: (schema: z.ZodString) =>
    schema
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .min(66)
      .max(66)
      .openapi({
        examples: [
          "0x000000000000000000000000C6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
        ],
        description: "Receiver address",
      }),
  tokenAddressFrom: (schema: z.ZodString) =>
    schema
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .min(66)
      .max(66)
      .openapi({
        examples: [
          "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
          "0x000000000000000000000000C6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
        ],
        description: "Token address on the sender chain",
      }),
  tokenAddressTo: (schema: z.ZodString) =>
    schema
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .min(66)
      .max(66)
      .openapi({
        examples: [
          "0x000000000000000000000000C6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
          "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
        ],
        description: "Token address on the receiver chain",
      }),
  amountFrom: (schema: z.ZodSchema) =>
    schema.openapi({
      example: "1000000000000000000",
      description: "Amount of tokens on the sender chain",
    }),
  amountTo: (schema: z.ZodSchema) =>
    schema.openapi({
      example: "1000000000000000000",
      description: "Amount of tokens on the receiver chain",
    }),
  chainFrom: (schema: z.ZodSchema) =>
    schema.openapi({
      example: SOLANA_DEV_CHAIN_ID.toString(),
      description: "Chain ID of the sender",
    }),
  chainTo: (schema: z.ZodSchema) =>
    schema.openapi({
      example: "22040",
      description: "Chain ID of the receiver",
    }),
  eventId: (schema: z.ZodSchema) =>
    schema.openapi({
      example: "3",
      description: "Event ID",
    }),
  flags: (schema: z.ZodSchema) =>
    schema.openapi({
      example: "0",
      description: "Flags for the transaction",
    }),
  data: (schema: z.ZodSchema) =>
    schema.openapi({
      example: "",
      description: "Data for the flags",
    }),
  claimed: (schema: z.ZodSchema) =>
    schema.openapi({
      example: false,
      description: "If receipt has been claimed",
    }),
});

export const receiptMetaEvmSchema = createSelectSchema(
  receiptsMetaInIndexerEvm,
  {
    receiptId: (schema: z.ZodString) =>
      schema.regex(receiptIdRegex).openapi({
        example: "6003100671677646000_22040_3",
        description: "Receipt ID as 'chainFrom_chainTo_eventId'"
      }),
    blockHash: (schema: z.ZodSchema) =>
      schema.openapi({
        example:
          "0x1c5d488013f993bc30b0fdd2a378fe157c634cb00fa2c47ee4f8a8d332450e30",
        description: "Block hash"
      }),
    blockNumber: (schema: z.ZodSchema) =>
      schema.openapi({
        example: "12345678",
        description: "Block number"
      }),
    timestamp: (schema: z.ZodSchema) =>
      schema.openapi({
        example: "1633632000",
        description: "Timestamp of the transaction"
      }),
    transactionHash: (schema: z.ZodSchema) =>
      schema.openapi({
        example:
          "0x48abbe56ad2eec690800f8cd79fa24908f430269a1931d30647b1c9daec19b1b",
        description: "Transaction hash"
      }),
    transactionIndex: (schema: z.ZodSchema) =>
      schema.openapi({
        example: 1,
        description: "Transaction index in the block"
      })
  }
);

export const receiptMetaSolanaSchema = createSelectSchema(
  receiptsMetaInIndexerSolana,
  {
    receiptId: (schema: z.ZodString) =>
      schema.regex(receiptIdRegex).openapi({
        example: "6003100671677646000_22040_3",
        description: "Receipt ID as 'chainFrom_chainTo_eventId'"
      }),
    blockHash: (schema: z.ZodSchema) =>
      schema.nullable().openapi({
        example: null,
        description: "Not appliable to solana"
      }),
    blockNumber: (schema: z.ZodSchema) =>
      schema.openapi({
        example: "12345678",
        description: "Block number (slot)"
      }),
    timestamp: (schema: z.ZodSchema) =>
      schema.openapi({
        example: "1633632000",
        description: "Timestamp of the transaction"
      }),
    transactionHash: (schema: z.ZodSchema) =>
      schema.openapi({
        example:
          "4HkfnhW93nGRiT3s9YnVnN4fS6masj5FJ99bsTb1AX13NNdaE1BkfVidQ4hTB41MUVcPShft4fRDnZgBBDwWzED5",
        description: "Transaction signature"
      }),
    transactionIndex: (schema: z.ZodNumber) =>
      schema.openapi({
        example: 1,
        description: "Transaction index in the block"
      })
  }
);

export const ReceiptMetaSchema = z.union([
  receiptMetaEvmSchema,
  receiptMetaSolanaSchema
]);

export const unsignedReceiptsResponseSchema = z.array(
  z.object({
    receipts: ReceiptSchema,
    receiptsMeta: ReceiptMetaSchema
  })
);

export const receiptResponseSchema = ReceiptSchema;

export const SendPayload = z.object({
  destChainId: z.bigint().min(1n, "networkTo is required").openapi({
    example: SOLANA_DEV_CHAIN_ID,
    description: "Chain ID of the receiver"
  }),
  tokenAddress: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid token address")
    .openapi({
      example:
        "0x000000000000000000000000C6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
      description: "Token address in bytes32 hex format"
    }),
  externalTokenAddress: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid external token address")
    .openapi({
      example:
        "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
      description: "External token address in bytes32 hex format"
    }),
  amountToSend: z.bigint().positive().min(1n, "amount is required").openapi({
    example: 1000000000000000000n,
    description: "Amount of tokens to send"
  }),
  feeAmount: z.bigint().positive().openapi({
    example: 10000000n,
    description: "Amount of fee needed to send the transaction"
  }),
  timestamp: z.number().openapi({
    example: 1633632000,
    description: "Timestamp of the transaction"
  }),
  flags: z.bigint().nonnegative().default(0n).openapi({
    example: 0n,
    description: "Flags for the transaction"
  }),
  flagData: z.string().default("").openapi({
    example: "",
    description: "Data for the flags as hex string"
  })
});

export type SendPayload = z.infer<typeof SendPayload>;

export const sendPayloadResponseSchema = z.object({
  sendPayload: SendPayload,
  signature: z.string().regex(signatureRegex).openapi({
    type: "string",
    description: "Signature of the transaction",
    example:
      "0x14610d481d0b786920d49cb6318a03ac781ae3a031b306932773c0aad66339547d271ec0c306f62f4e297a8a6cd4c05774863a24852b3fe9a499a355a5fe8fb11b"
  })
});
