import { Dependency } from "hono-simple-di";
import { z } from "zod";
import { validator as zValidator } from "hono-openapi/zod";
import { ReceiptController } from "../controllers/receipt.controller";
import { receiptResponseSchema } from "./utils";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { tokens } from "../utils/tokens2";
import { formatUnits } from "viem";
import { addressToUserFriendly } from "../utils/addresses";

const receiptControllerDep = new Dependency((c) => {
  const vars = env<{
    DATABASE_URL: string
  }>(c);
  return new ReceiptController(vars.DATABASE_URL);
});

export const backofficeRoutes = new Hono();


backofficeRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      limit: z.coerce.number().optional().default(50),
      offset: z.coerce.number().optional().default(0),
      ordering: z.enum(["asc", "desc"]).optional().default("desc"),
      chainFrom: z.coerce.number().optional(),
      chainTo: z.coerce.number().optional(),
    })
  ),
  receiptControllerDep.middleware("receiptController"),
  async (c) => {
    const { limit, offset, ordering, chainFrom, chainTo } = c.req.valid("query");
    const { receiptController } = c.var;

    try {
      const data = z.array(receiptResponseSchema).parse(
        await receiptController.getAllReceipts(limit, offset, ordering, undefined, chainFrom, chainTo)
      );


      const resultPromises = data.map(async ({ receipt, receiptMeta }) => {
        const tokenFrom = getToken(receipt.chainFrom, receipt.tokenAddressFrom);
        const tokenTo = tokens.getToken(receipt.chainTo, receipt.tokenAddressTo);

        const metaMap = {};
        receiptMeta.forEach((meta) => metaMap[meta.eventChain] = meta);

        // status 5 if claimed
        // status 1.n if not claimed, where n is the number of signatures
        let status = 5;
        if (!receipt.claimed) {
          const signs = await receiptController.getReceiptSignatures(receipt.receiptId);
          status = +`1.${signs.length}`;
        }

        return {
          eventId: +receipt.receiptId.split("_")[2],
          receiptId: receipt.receiptId,
          addressFrom: addressToUserFriendly(receipt.from),
          addressTo: addressToUserFriendly(receipt.to),
          tokenFrom,
          tokenTo,
          amount: receipt.amountFrom,
          denominatedAmount: formatUnits(receipt.amountFrom, tokenFrom?.denomination ?? 1).toString(),
          status,
          sendTx: metaMap[receipt.chainFrom],
          receiveTx: metaMap[receipt.chainTo]
        }
      });
      const result = await Promise.all(resultPromises);

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
  if (!token)
    return { address: tokenAddr }

  return {
    name: token.name,
    symbol: token.symbol,
    denomination: token.denomination,
    address: tokenAddr,
    isNative: !!token.nativeCoin,
    network: chain,
  }
}


export default backofficeRoutes;
