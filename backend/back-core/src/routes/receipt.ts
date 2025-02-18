import { Dependency } from "hono-simple-di";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { ReceiptController } from "../controllers/receipt.controller";
import {
  evmAddressValidatorSchema,
  receiptIdValidatorSchema,
  svmAddressValidatorSchema,
  svmAddressBytes32Hex,
  evmAddressBytes32Hex,
} from "./utils.js";
import { Hono } from "hono";
import { env } from "hono/adapter";

const receiptControllerDep = new Dependency(
  (c) => {
    const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
    return new ReceiptController(DATABASE_URL);
  }
);

export const receiptRoutes = new Hono();

/* The code `routes.get("/receipts", async (c) => { ... })` is defining a route for handling GET requests
to the "/receipts" endpoint. When a GET request is made to this endpoint, the code inside the callback
function will be executed. */

receiptRoutes.get(
  "/evm/unsigned/:address{0x[a-fA-F0-9]{40}}",
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
      return c.json(error, 400);
    }
  }
);

receiptRoutes.get(
  "/svm/unsigned/:address{[1-9A-HJ-NP-Za-km-z]{32,44}}",
  zValidator("param", svmAddressValidatorSchema),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    try {
      const pubkey = c.req.valid("param").address;
      const { receiptController } = c.var;
      const data = await receiptController.getUnsignedReceipts(pubkey, "svm");
      return c.json(data, 200);
    } catch (error) {
      console.error(error);
      return c.json(error, 400);
    }
  }
);

receiptRoutes.get(
  "/:id{[0-9]+_[0-9]+_[0-9]+}",
  zValidator("param", receiptIdValidatorSchema),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    try {
      const receiptId = c.req.valid("param").receiptId;
      const { receiptController } = c.var;
      const data = await receiptController.getReceipt(receiptId);
      return c.json(data, 200);
    } catch (error) {
      console.log(error);
      return c.json(error, 400);
    }
  }
);

receiptRoutes.post(
  "/:id{[0-9]+_[0-9]+_[0-9]+}",
  zValidator("param", receiptIdValidatorSchema),
  zValidator(
    "json",
    z.object({
      signature: z
        .string()
        .regex(/^(0x|0X)?[a-fA-F0-9]{130}$/)
        .transform((val) => {
          const processed = String(val);
          if (processed.startsWith("0X") || processed.startsWith("0x")) {
            return processed.slice(2);
          }
          return `0x${processed}` as `0x${string}`;
        }),
    })
  ),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    try {
      const { receiptController } = c.var;
      const receiptId = c.req.valid("param").receiptId;
      const signature = c.req.valid("json").signature as `0x${string}`;
      const data = await receiptController.addSignature(receiptId, signature);
      return c.json(data, 201);
    } catch (error) {
      console.log(error);
      return c.json(error, 400);
    }
  }
);

receiptRoutes.get(
  "/:address{(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})}?",
  zValidator(
    "param",
    z.object({
      userAddress: z
        .union([evmAddressBytes32Hex, svmAddressBytes32Hex])
        .optional(),
    })
  ),
  zValidator(
    "query",
    z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
      ordering: z.enum(["asc", "desc"]).optional().default("desc"),
    })
  ),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    try {
      const { limit, offset, ordering } = c.req.valid("query");
      const { userAddress } = c.req.valid("param");
      const { receiptController } = c.var;
      const data = await receiptController.getAllReceipts(
        limit,
        offset,
        ordering,
        userAddress
      );
      return c.json(data, 200);
    } catch (error) {
      console.log(error);
      return c.json(error, 400);
    }
  }
);

export default receiptRoutes;