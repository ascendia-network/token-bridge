import { z } from "zod";
import "zod-openapi/extend";
import { Base58 } from "ox";
import { receipt, signatures } from "../db/schema/core.schema";
import { receiptsMetaInIndexerEvm } from "../db/schema/evm.schema";
import { receiptsMetaInIndexerSolana } from "../db/schema/solana.schema";
import { createSelectSchema } from "drizzle-zod";
import { SOLANA_DEV_CHAIN_ID } from "../../config";

export const EvmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
export const SvmAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const signatureRegex = /^(0x|0X)?[a-fA-F0-9]{128,130}$/;
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
    example: "0xC6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
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
        message: "Not a valid Solana address",
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
    description: "Solana base58 address",
    example: "FMYR5BFh3JapZS1cfwYViiBMYJxFGwKdchnghBnBtxkk",
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
    }),
});

export const evmAddressValidatorSchema = z.object({
  address: z.string().regex(EvmAddressRegex).openapi({
    type: "string",
    description: "EVM address",
    example: "0xe0b52EC5cE3e124ab5306ea42463bE85aeb5eDDd",
  }),
});

export const svmAddressValidatorSchema = z.object({
  address: z.string().regex(SvmAddressRegex).openapi({
    type: "string",
    description: "Solana base58 address",
    example: "FMYR5BFh3JapZS1cfwYViiBMYJxFGwKdchnghBnBtxkk",
  }),
});

export const receiptIdValidatorSchema = z.object({
  receiptId: z
    .string()
    .regex(receiptIdRegex)
    .transform((val) => val as `${number}_${number}_${number}`)
    .openapi({
      type: "string",
      description: "Receipt ID as 'chainFrom_chainTo_receiptId'",
      example: "1_22040_3",
    }),
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
    .optional(),
});

export const payloadEvmValidatorSchema = payloadValidatorSchema.extend({
  tokenAddress: evmAddressBytes32Hex,
});

export const payloadSvmValidatorSchema = payloadValidatorSchema.extend({
  tokenAddress: svmAddressBytes32Hex,
});

export const sendSignatureQuerySchema = z.object({
  networkFrom: z.coerce.bigint().min(1n, "networkFrom is required").openapi({
    example: 1n,
    description: "Chain ID of the sender",
  }),
  networkTo: z.coerce.bigint().min(1n, "networkTo is required").openapi({
    example: SOLANA_DEV_CHAIN_ID,
    description: "Chain ID of the receiver",
  }),
  tokenAddress: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid token address")
    .openapi({
      example:
        "0x000000000000000000000000C6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
      description: "Token address in bytes32 hex format",
    }),
  amount: z.coerce.bigint().positive().min(1n, "amount is required").openapi({
    example: 1000000000000000000n,
    description: "Amount of tokens to send",
  }),
  isMaxAmount: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .default("false")
    .openapi({
      example: false,
      description:
        "Whether to send the maximum amount of tokens (only for native tokens)",
    }),
  externalTokenAddress: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid external token address")
    .openapi({
      example:
        "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
      description: "External token address in bytes32 hex format",
    }),
  flags: z.coerce.bigint().nonnegative().default(0n).openapi({
    example: 0n,
    description: "Flags for the transaction",
  }),
  flagData: z.string().default("").openapi({
    example: "",
    description: "Data for the flags",
  }),
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
        description: "Receipt ID as 'chainFrom_chainTo_eventId'",
      }),
    blockHash: (schema: z.ZodSchema) =>
      schema.openapi({
        example:
          "0x1c5d488013f993bc30b0fdd2a378fe157c634cb00fa2c47ee4f8a8d332450e30",
        description: "Block hash",
      }),
    blockNumber: (schema: z.ZodSchema) =>
      schema.openapi({
        example: "12345678",
        description: "Block number",
      }),
    timestamp: (schema: z.ZodSchema) =>
      schema.openapi({
        example: "1633632000",
        description: "Timestamp of the transaction",
      }),
    transactionHash: (schema: z.ZodSchema) =>
      schema.openapi({
        example:
          "0x48abbe56ad2eec690800f8cd79fa24908f430269a1931d30647b1c9daec19b1b",
        description: "Transaction hash",
      }),
    transactionIndex: (schema: z.ZodSchema) =>
      schema.openapi({
        example: 1,
        description: "Transaction index in the block",
      }),
  }
);

export const receiptMetaSolanaSchema = createSelectSchema(
  receiptsMetaInIndexerSolana,
  {
    receiptId: (schema: z.ZodString) =>
      schema.regex(receiptIdRegex).openapi({
        example: "6003100671677646000_22040_3",
        description: "Receipt ID as 'chainFrom_chainTo_eventId'",
      }),
    blockHash: (schema: z.ZodSchema) =>
      schema.nullable().openapi({
        example: null,
        description: "Not appliable to solana",
      }),
    blockNumber: (schema: z.ZodSchema) =>
      schema.openapi({
        example: "12345678",
        description: "Block number (slot)",
      }),
    timestamp: (schema: z.ZodSchema) =>
      schema.openapi({
        example: "1633632000",
        description: "Timestamp of the transaction",
      }),
    transactionHash: (schema: z.ZodSchema) =>
      schema.openapi({
        example:
          "4HkfnhW93nGRiT3s9YnVnN4fS6masj5FJ99bsTb1AX13NNdaE1BkfVidQ4hTB41MUVcPShft4fRDnZgBBDwWzED5",
        description: "Transaction signature",
      }),
    transactionIndex: (schema: z.ZodNumber) =>
      schema.openapi({
        example: 1,
        description: "Transaction index in the block",
      }),
  }
);

export const ReceiptMetaSchema = z.union([
  receiptMetaEvmSchema,
  receiptMetaSolanaSchema,
]);

export const unsignedReceiptsResponseSchema = z.array(
  z.object({
    receipts: ReceiptSchema,
    receiptsMeta: ReceiptMetaSchema,
  })
);

const signaturesSchema = createSelectSchema(signatures, {
  receiptId: (schema: z.ZodString) =>
    schema.regex(receiptIdRegex).openapi({
      example: "6003100671677646000_22040_3",
      description: "Receipt ID as 'chainFrom_chainTo_eventId",
    }),
  signedBy: (schema: z.ZodString) =>
    schema.openapi({
      examples: [
        "GCSfaYKrPKirtS33JzVZbAZmbwyGenWTXx9Zf77qo882",
        "0x0659f7D44aE52AA209319de9Ea99Da2FebABfD81",
      ],
      description: "Address of the relayer",
    }),
  signature: (schema: z.ZodString) =>
    schema.regex(signatureRegex).openapi({
      example:
        "0x14610d481d0b786920d49cb6318a03ac781ae3a031b306932773c0aad66339547d271ec0c306f62f4e297a8a6cd4c05774863a24852b3fe9a499a355a5fe8fb11b",
      description: "Signature of the transaction",
    }),
}).omit({ id: true });

export const receiptResponseSchema = z.object({
  receipt: ReceiptSchema,
  receiptMeta: z.array(ReceiptMetaSchema),
});

export const signaturesResponseSchema = z.object({
  receiptId: z.string().regex(receiptIdRegex).openapi({
    example: "6003100671677646000_22040_3",
    description: "Receipt ID as 'chainFrom_chainTo_eventId",
  }),
  signatures: z.array(signaturesSchema).openapi({
    description: "Signatures of the transaction",
  }),
});

export const SendPayloadEVM = z.object({
  destChainId: z.coerce.bigint().min(1n, "destChainId is required").openapi({
    example: SOLANA_DEV_CHAIN_ID,
    description: "Chain ID of the receiver",
  }),
  tokenAddress: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid token address")
    .openapi({
      example:
        "0x000000000000000000000000C6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
      description: "Token address in bytes32 hex format",
    }),
  externalTokenAddress: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid external token address")
    .openapi({
      example:
        "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
      description: "External token address in bytes32 hex format",
    }),
  amountToSend: z.coerce
    .bigint()
    .positive()
    .min(1n, "amount is required")
    .openapi({
      example: 1000000000000000000n,
      description: "Amount of tokens to send",
    }),
  feeAmount: z.coerce.bigint().positive().openapi({
    example: 10000000n,
    description: "Amount of fee needed to send the transaction",
  }),
  timestamp: z.coerce.number().openapi({
    example: 1633632000,
    description: "Timestamp of the transaction",
  }),
  flags: z.coerce.bigint().nonnegative().default(0n).openapi({
    example: 0n,
    description: "Flags for the transaction",
  }),
  flagData: z.string().default("").openapi({
    example: "",
    description: "Data for the flags as hex string",
  }),
});

export type SendPayloadEVM = z.infer<typeof SendPayloadEVM>;

export const SendPayloadSolana = z.object({
  tokenAddressFrom: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .openapi({
      example:
        "0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001",
      description: "Solana token address in bytes32 hex format",
    }),
  tokenAddressTo: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .openapi({
      example: "0xc6542ef81b2ee80f0bac1abef6d920c92a590ec7",
      description: "EVM token address in bytes20 hex format",
    }),
  amountToSend: z.coerce
    .bigint()
    .positive()
    .min(1n, "amount is required")
    .openapi({
      example: 1000000000000000000n,
      description: "Amount of tokens to send",
    }),
  feeAmount: z.coerce.bigint().positive().openapi({
    example: 10000000n,
    description: "Amount of fee needed to send the transaction",
  }),
  chainFrom: z.coerce.bigint().min(1n, "chainFrom is required").openapi({
    example: SOLANA_DEV_CHAIN_ID,
    description: "Chain ID of the sender chain",
  }),
  timestamp: z.coerce.number().openapi({
    example: 1633632000,
    description: "Timestamp of the signed payload",
  }),
  flags: z.coerce.bigint().nonnegative().default(0n).openapi({
    example: 0n,
    description: "Flags for the transaction",
  }),
  flagData: z.string().default("").openapi({
    example: "",
    description: "Data for the flags as hex string",
  }),
});

export type SendPayloadSolana = z.infer<typeof SendPayloadSolana>;

export const sendPayloadResponseSchema = z.object({
  sendPayload: SendPayloadEVM.or(SendPayloadSolana),
  signature: z.string().regex(signatureRegex).openapi({
    type: "string",
    description: "Signature of the transaction",
    example:
      "0x14610d481d0b786920d49cb6318a03ac781ae3a031b306932773c0aad66339547d271ec0c306f62f4e297a8a6cd4c05774863a24852b3fe9a499a355a5fe8fb11b",
  }),
});

export const TokenConfigSchema = z.object({
  bridges: z
    .record(
      z
        .string()
        .describe("Network")
        .openapi({
          description: "Network symbol",
          examples: ["sol", "eth", "bsc", "base"],
        }),
      z.object({
        amb: z.string().optional().openapi({
          description: "Address of the AMB bridge",
          example: "0x0659f7D44aE52AA209319de9Ea99Da2FebABfD81",
        }),
        "amb-test": z.string().optional().openapi({
          description: "Address of the AMB test bridge",
          example: "0x0659f7D44aE52AA209319de9Ea99Da2FebABfD81",
        }),
        "amb-dev": z.string().optional().openapi({
          description: "Address of the AMB dev bridge",
          example: "0x0659f7D44aE52AA209319de9Ea99Da2FebABfD81",
        }),
        side: z.string().optional().openapi({
          description: "Address of the side chain bridge",
          example: "0x0659f7D44aE52AA209319de9Ea99Da2FebABfD81",
        }),
      })
    )
    .openapi({
      description: "Bridges for different networks",
      example: {
        sol: {
          amb: "0x81c448672fc9167aa5c00B2eD773e8d2ff3F19BE",
          side: "ambZMSUBvU8bLfxop5uupQd9tcafeJKea1KoyTv2yM1",
        },
        base: {
          amb: "0xAe91d2F64BDDC37a9E3dd39507E5Bb58955d1813",
        },
      },
    }),
  tokens: z
    .record(
      z
        .string()
        .describe("Symbol")
        .openapi({
          description: "Token symbol",
          examples: ["USDC", "SAMB", "wSOL"],
        }),
      z.object({
        isActive: z.boolean().openapi({
          description: "If token is active for transfers",
          example: true,
        }),
        name: z.string().openapi({
          description: "Token name",
          examples: ["USD Coin", "Synthetic Amber", "Wrapped SOL"],
        }),
        symbol: z.string().openapi({
          description: "Token symbol",
          examples: ["USDC", "SAMB", "wSOL"],
        }),
        denomination: z.number().openapi({
          description: "Token denomination",
          example: 18,
        }),
        decimals: z.record(
          z
            .string()
            .describe("Network")
            .openapi({
              description: "Network symbol",
              examples: ["sol", "eth", "bsc", "base"],
            }),
          z.number().openapi({
            description: "Token decimals",
            examples: [6, 18, 6, 9],
          })
        ),
        logo: z.string().url().openapi({
          description: "Token logo URL",
          example:
            "https://en.wikipedia.org/wiki/File:Solana_logo.png#/media/File:Solana_logo.png",
        }),
        primaryNets: z.array(z.string().describe("Network")).openapi({
          description: "Primary networks for the token",
          examples: [["sol"], ["eth", "bsc"]],
        }),
        addresses: z
          .record(z.string().describe("Network"), z.string())
          .openapi({
            description: "Token addresses on different networks",
            examples: [
              {
                "amb-test": "0x8132928B8F4c0d278cc849b9b98Dffb28aE0B685",
                sol: "usdc3xpQ18NLAumSUvadS62srrkxQWrvQHugk8Nv7MA",
              },
              {
                "amb-test": "0xC6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
                sol: "So11111111111111111111111111111111111111112",
                "sol-dev": "So11111111111111111111111111111111111111112",
              },
            ],
          }),
        nativeAnalog: z.string().openapi({
          description: "Native analog token",
          examples: ["", "AMB", "SOL"],
        }),
      })
    )
    .openapi({
      description: "Token configuration",
      example: {
        SAMB: {
          isActive: true,
          name: "Synthetic Amber",
          symbol: "SAMB",
          denomination: 18,
          decimals: {
            "amb-test": 18,
            amb: 18,
            base: 18,
            sol: 6,
          },
          logo: "https://media-exp1.licdn.com/dms/image/C560BAQFuR2Fncbgbtg/company-logo_200_200/0/1636390910839?e=2159024400&v=beta&t=W0WA5w02tIEH859mVypmzB_FPn29tS5JqTEYr4EYvps",
          primaryNets: ["amb"],
          addresses: {
            "amb-test": "0x2Cf845b49e1c4E5D657fbBF36E97B7B5B7B7b74b",
            sol: "samb9vCFCTEvoi3eWDErSCb5GvTq8Kgv6VKSqvt7pgi",
          },
          nativeAnalog: "AMB",
        },
        USDC: {
          isActive: true,
          name: "USD Coin",
          symbol: "USDC",
          denomination: 6,
          decimals: {
            "amb-test": 18,
            amb: 18,
            bsc: 18,
            eth: 6,
          },
          logo: "https://etherscan.io/token/images/centre-usdc_28.png",
          primaryNets: ["base", "sol"],
          addresses: {
            "amb-test": "0x8132928B8F4c0d278cc849b9b98Dffb28aE0B685",
            sol: "usdc3xpQ18NLAumSUvadS62srrkxQWrvQHugk8Nv7MA",
          },
          nativeAnalog: "",
        },
        wSOL: {
          isActive: true,
          name: "Wrapped Solana",
          symbol: "wSOL",
          denomination: 18,
          decimals: {
            "amb-test": 18,
            amb: 18,
            base: 18,
            sol: 6,
          },
          logo: "https://en.wikipedia.org/wiki/File:Solana_logo.png#/media/File:Solana_logo.png",
          primaryNets: ["sol"],
          addresses: {
            "amb-test": "0xC6542eF81b2EE80f0bAc1AbEF6d920C92A590Ec7",
            sol: "So11111111111111111111111111111111111111112",
            "sol-dev": "So11111111111111111111111111111111111111112",
          },
          nativeAnalog: "SOL",
        },
      },
    }),
});

export type TokenConfig = z.infer<typeof TokenConfigSchema>;
