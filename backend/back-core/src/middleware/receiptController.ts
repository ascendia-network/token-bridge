import { Dependency } from "hono-simple-di";
import { ReceiptController } from "../controllers/receipt.controller";
import { env } from "hono/adapter";

export const receiptControllerMiddleware = new Dependency((c) => {
  const vars = env<{
    DATABASE_URL: string
  }>(c);
  return new ReceiptController(vars.DATABASE_URL);
});