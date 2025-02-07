import { Dependency } from "hono-simple-di";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { PayloadController } from "../controllers/payload.controller";
import { Hono } from "hono";

const payloadControllerDep = new Dependency((c) => new PayloadController(c.env.DATABASE_URL));
export const payloadRoutes = new Hono();


/* The code block you provided is defining routes for handling signing payload in a bridge inventory API. */
payloadRoutes.get(
  "/evm/:tokenAddress{0x[a-fA-F0-9]{40}}/:amount{[0-9]+}/:flags{[0-9]+}/:flagData{(0x|0X)?[0-9a-fA-F]+}?",
  payloadControllerDep.middleware("payloadController"),
  async (c) => {
    try {
      const { payloadController } = c.var;
      const data = await payloadController.getPayloadSigned(c, "evm");
      return c.json(data, 200);
    } catch (error) {
      console.log(error);
      return c.json(error, 400);
    }
  }
);

payloadRoutes.get(
  "/svm/:tokenAddress{[1-9A-HJ-NP-Za-km-z]{32,44}}/:amount{[0-9]+}/:flags{[0-9]+}/:flagData{(0x|0X)?[0-9a-fA-F]+}?",
  payloadControllerDep.middleware("payloadController"),
  async (c) => {
    try {
      const { payloadController } = c.var;
      const data = await payloadController.getPayloadSigned(c, "svm");
      return c.json(data, 200);
    } catch (error) {
      console.log(error);
      return c.json(error, 400);
    }
  }
);

export default payloadRoutes;