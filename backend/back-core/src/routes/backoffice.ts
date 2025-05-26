import { z } from "zod";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { BackofficeReceiptResponse, BackofficeReceipt } from "./utils";
import { Hono } from "hono";
import { tokens } from "../utils/tokens2";
import { formatUnits } from "viem";
import { addressToUserFriendly } from "../utils/addresses";
import { receiptControllerMiddleware } from "../middleware/receiptController";
import { describeRoute } from "hono-openapi";

export const backofficeRoutes = new Hono();

backofficeRoutes.get(
  "/",
  describeRoute({
    description: "Get all receipts for backoffice",
    responses: {
      200: {
        description: "Returns all receipts",
        content: {
          "application/json": {
            schema: resolver(BackofficeReceiptResponse),
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
                  example: "Error message",
                },
              },
            },
          },
        },
      },
    },
  }),
  zValidator(
    "query",
    z.object({
      limit: z.coerce.number().optional().default(50),
      offset: z.coerce.number().optional().default(0),
      ordering: z.enum(["asc", "desc"]).optional().default("desc"),
      chainFrom: z.coerce.bigint().optional(),
      chainTo: z.coerce.bigint().optional(),
    })
  ),
  receiptControllerMiddleware.middleware("receiptController"),
  async (c) => {
    const { limit, offset, ordering, chainFrom, chainTo } =
      c.req.valid("query");
    const { receiptController } = c.var;

    try {
      const { data } = await receiptController.getAllReceipts(
        limit,
        offset,
        ordering,
        undefined,
        chainFrom,
        chainTo
      );

      console.log("DATA!!!", data)

      const resultPromises = data.map(async ({ receipt, receiptMeta }) => {
        const tokenFrom = getToken(receipt.chainFrom, receipt.tokenAddressFrom);
        const tokenTo = getToken(receipt.chainTo, receipt.tokenAddressTo);

        const metaMap: Record<string, (typeof receiptMeta)[number]> = {};
        receiptMeta.forEach((meta) => (metaMap[meta.eventChain!] = meta));

        // status 5 if claimed
        // status 1.n if not claimed, where n is the number of signatures
        let status = 5;
        if (!receipt.claimed) {
          const signs = await receiptController.getReceiptSignatures(
            receipt.receiptId as `${number}_${number}_${number}`
          );
          if (signs.length === 5)
            status = 4; // all signatures ready, but not claimed
          else
            status = +`3.${signs.length}`;
        }

        return BackofficeReceipt.parse({
          eventId: +receipt.receiptId.split("_")[2],
          receiptId: receipt.receiptId,
          addressFrom: addressToUserFriendly(receipt.from),
          addressTo: addressToUserFriendly(receipt.to),
          tokenFrom,
          tokenTo,
          amount: receipt.amountFrom,
          denominatedAmount: formatUnits(
            BigInt(receipt.amountFrom),
            tokenFrom?.denomination ?? 1
          ).toString(),
          status,
          sendTx: metaMap[receipt.chainFrom],
          receiveTx: metaMap[receipt.chainTo],
        });
      });
      const result = BackofficeReceiptResponse.parse(
        await Promise.all(resultPromises)
      );

      return c.json(result, 200);
    } catch (error) {
      console.error(error);
      return c.json({ message: (error as Error).message }, 400);
    }
  }
);

// convert to v1 format
function getToken(chain: string, tokenAddr: string) {
  tokenAddr = addressToUserFriendly(tokenAddr);
  const token = tokens.getToken(chain, tokenAddr);
  if (!token) return { address: tokenAddr };

  return {
    name: token.name,
    symbol: token.symbol,
    denomination: token.denomination,
    address: tokenAddr,
    isNative: !!token.nativeCoin,
    network: chain,
  };
}

export default backofficeRoutes;
