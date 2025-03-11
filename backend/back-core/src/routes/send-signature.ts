/*
 *  Copyright: Ambrosus Inc.
 *  Email: tech@ambrosus.io
 *
 *  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 *  This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
 */

import { Dependency } from "hono-simple-di";
import { Hono } from "hono";
import { SendSignatureController } from "../controllers/send-signature.controller";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { sendPayloadResponseSchema, sendSignatureQuerySchema } from "./utils";
import { env } from "hono/adapter";
import { CORS_CONFIG } from "../../config";
import { cors } from "hono/cors";

const sendSignatureControllerDep = new Dependency((c) => {
  const { SEND_SIGNER_MNEMONIC } = env<{
    SEND_SIGNER_MNEMONIC: string;
  }>(c);
  return new SendSignatureController(SEND_SIGNER_MNEMONIC);
});

export const sendSignatureRoutes = new Hono();
sendSignatureRoutes.use("*", cors(CORS_CONFIG));

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
  sendSignatureControllerDep.middleware("sendSignatureController"),
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
      return c.json(data, 200);
    } catch (error) {
      console.log(error);
      return c.json({ message: (error as Error).message }, 400);
    }
  }
);

export default sendSignatureRoutes;
