import { Dependency } from "hono-simple-di";
import { z } from "zod";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { ReceiptController } from "../controllers/receipt.controller";
import {
  evmAddressValidatorSchema,
  receiptIdValidatorSchema,
  svmAddressValidatorSchema,
  svmAddressBytes32Hex,
  evmAddressBytes32Hex,
  unsignedReceiptsResponseSchema,
  receiptResponseSchema,
  signatureRegex
} from "./utils";
import { Hono } from "hono";
import { env } from "hono/adapter";

const receiptControllerDep = new Dependency((c) => {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  return new ReceiptController(DATABASE_URL);
});

export const receiptRoutes = new Hono();

/* The code `routes.get("/receipts", async (c) => { ... })` is defining a route for handling GET requests
to the "/receipts" endpoint. When a GET request is made to this endpoint, the code inside the callback
function will be executed. */

receiptRoutes.get(
  "/evm/unsigned/:address",
  describeRoute({
    description:
      "Get unsigned EVM receipts that need to be signed by given address",
    responses: {
      200: {
        description: "Returns unsigned EVM receipts with receipt metadata",
        content: {
          "application/json": {
            schema: resolver(unsignedReceiptsResponseSchema)
          }
        }
      },
      400: {
        description: "Returns error message",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: {
                  type: "string"
                }
              }
            }
          }
        }
      }
    }
  }),
  zValidator("param", evmAddressValidatorSchema),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    try {
      const pubkey = c.req.valid("param").address;
      const { receiptController } = c.var;
      const data = await receiptController.getUnsignedReceipts(pubkey, "evm");
      return c.json(data, 200);
    } catch (error) {
      console.log(error);
      return c.json({ message: (error as Error).message }, 400);
    }
  }
);

receiptRoutes.get(
  "/svm/unsigned/:address",
  describeRoute({
    description:
      "Get unsigned Solana receipts that need to be signed by given address",
    responses: {
      200: {
        description: "Returns unsigned Solana receipts with receipt metadata",
        content: {
          "application/json": {
            schema: resolver(unsignedReceiptsResponseSchema)
          }
        }
      },
      400: {
        description: "Returns error message",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: {
                  type: "string"
                }
              }
            }
          }
        }
      }
    }
  }),
  zValidator("param", svmAddressValidatorSchema),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    try {
      const pubkey = c.req.valid("param").address;
      const { receiptController } = c.var;
      const data = await receiptController.getUnsignedReceipts(pubkey, "svm");
      return c.json(unsignedReceiptsResponseSchema.parse(data), 200);
    } catch (error) {
      console.error(error);
      return c.json({ message: (error as Error).message }, 400);
    }
  }
);

async function getReceipts(
  receiptController: ReceiptController,
  limit: number,
  offset: number,
  ordering: "asc" | "desc",
  userAddress: string | undefined = undefined
) {
  const data = await receiptController.getAllReceipts(
    limit,
    offset,
    ordering,
    userAddress
  );
  return z.array(receiptResponseSchema).parse(data);
}

receiptRoutes.get(
  "/",
  describeRoute({
    description: "Get all receipts",
    responses: {
      200: {
        description: "Returns receipts",
        content: {
          "application/json": {
            schema: resolver(z.array(receiptResponseSchema))
          }
        }
      },
      400: {
        // 400 Bad Request
        description: "Returns error message",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: {
                  type: "string"
                }
              }
            }
          }
        }
      }
    }
  }),
  zValidator(
    "query",
    z.object({
      limit: z.coerce.number().optional().default(50),
      offset: z.coerce.number().optional().default(0),
      ordering: z.enum(["asc", "desc"]).optional().default("desc")
    })
  ),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    const { limit, offset, ordering } = c.req.valid("query");
    const { receiptController } = c.var;
    try {
      const data = await getReceipts(
        receiptController,
        limit,
        offset,
        ordering
      );
      return c.json(data, 200);
    } catch (error) {
      console.error(error);
      return c.json({ message: (error as Error).message }, 400);
    }
  }
);

receiptRoutes.get(
  "/user/:userAddress?",
  describeRoute({
    description: "Get all receipts for a user",
    responses: {
      200: {
        description: "Returns receipts",
        content: {
          "application/json": {
            schema: resolver(z.array(receiptResponseSchema))
          }
        }
      },
      400: {
        description: "Returns error message",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: {
                  type: "string"
                }
              }
            }
          }
        }
      }
    }
  }),
  zValidator(
    "param",
    z.object({
      userAddress: z
        .union([evmAddressBytes32Hex, svmAddressBytes32Hex])
        .optional()
    })
  ),
  zValidator(
    "query",
    z.object({
      limit: z.coerce.number().optional().default(50),
      offset: z.coerce.number().optional().default(0),
      ordering: z.enum(["asc", "desc"]).optional().default("desc")
    })
  ),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    const { userAddress } = c.req.valid("param");
    const { limit, offset, ordering } = c.req.valid("query");
    const { receiptController } = c.var;
    try {
      const data = await getReceipts(
        receiptController,
        limit,
        offset,
        ordering,
        userAddress
      );
      return c.json(data, 200);
    } catch (error) {
      console.error(error);
      return c.json({ message: (error as Error).message }, 400);
    }
  }
);

receiptRoutes.post(
  "/:receiptId",
  describeRoute({
    description: "Add signature to receipt",
    responses: {
      201: {
        description: "Returns receipt",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                signed: {
                  type: "boolean"
                }
              },
              example: { signed: true },
              description: "If receipt has been signed"
            }
          }
        }
      },
      400: {
        description: "Returns error message",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: {
                  type: "string"
                }
              }
            }
          }
        }
      }
    }
  }),
  zValidator("param", receiptIdValidatorSchema),
  zValidator(
    "json",
    z.object({
      signer: z.string().openapi({
        examples: [
          "0xe0b52EC5cE3e124ab5306ea42463bE85aeb5eDDd",
          "FMYR5BFh3JapZS1cfwYViiBMYJxFGwKdchnghBnBtxkk"
        ],
        description: "Signer address"
      }),
      signature: z
        .string()
        .regex(signatureRegex)
        .transform((val) => {
          const processed = String(val);
          if (processed.startsWith("0X") || processed.startsWith("0x")) {
            return `0x${processed.slice(2)}` as `0x${string}`;
          }
          return `0x${processed}` as `0x${string}`;
        })
    })
  ),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    try {
      const { receiptController } = c.var;
      const receiptId = c.req.valid("param").receiptId;
      const signature = c.req.valid("json").signature as `0x${string}`;
      const signer = c.req.valid("json").signer;
      const data = await receiptController.addSignature(
        receiptId,
        signer,
        signature
      );
      return c.json({ signed: data }, 201);
    } catch (error) {
      console.log(error);
      return c.json({ message: (error as Error).message }, 400);
    }
  }
);

receiptRoutes.get(
  "/:receiptId",
  describeRoute({
    description: "Get receipt by id",
    responses: {
      200: {
        description: "Returns receipt",
        content: {
          "application/json": {
            schema: resolver(receiptResponseSchema)
          }
        }
      },
      400: {
        description: "Returns error message",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: {
                  type: "string"
                }
              }
            }
          }
        }
      }
    }
  }),
  zValidator("param", receiptIdValidatorSchema),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    try {
      const receiptId = c.req.valid("param").receiptId;
      const { receiptController } = c.var;
      const data = await receiptController.getReceipt(receiptId);
      console.log(data);
      return c.json(receiptResponseSchema.parse(data), 200);
    } catch (error) {
      console.log(error);
      return c.json({ message: (error as Error).message }, 400);
    }
  }
);

export default receiptRoutes;
