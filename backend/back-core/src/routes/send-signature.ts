import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { sendPayloadResponseSchema, sendSignatureQuerySchema } from "./utils";
import { sendSignatureControllerMiddleware } from "../middleware/sendSignature";


export const sendSignatureRoutes = new Hono();

sendSignatureRoutes.get(
  "/",
  describeRoute({
    description: "Get signed send payload for cross-chain transfer",
    responses: {
      200: {
        description: "Returns signed send payload",
        content: {
          "application/json": {
            schema: resolver(sendPayloadResponseSchema),
          },
        },
      },
      400: {
        description: "Returns error message",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
  }),
  zValidator("query", sendSignatureQuerySchema),
  sendSignatureControllerMiddleware.middleware("sendSignatureController"),
  async (c) => {
    try {
      const {
        networkFrom,
        networkTo,
        tokenAddress,
        amount,
        isMaxAmount,
        externalTokenAddress,
        flags,
        flagData,
      } = c.req.valid("query");
      const { sendSignatureController } = c.var;
      const data = await sendSignatureController.getSendSignature({
        networkFrom,
        externalTokenAddress,
        networkTo,
        tokenAddress,
        amount,
        isMaxAmount: Boolean(isMaxAmount),
        flags,
        flagData,
      });
      return c.json(sendPayloadResponseSchema.parse(data), 200);
    } catch (error) {
      console.log(error);
      return c.json({ message: (error as Error).message }, 400);
    }
  }
);

export default sendSignatureRoutes;
