import { Hono } from "hono";
import receiptRoutes from "./receipt";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import sendSignatureRoutes from "./send-signature";
import { stageConfig } from "../../config";
import { TokenConfigSchema } from "./utils";

export const routes = new Hono();

/* The code `routes.get("/", (c) => c.json("Bridge Inventory API", 200));` is defining a route for
handling GET requests to the root endpoint ("/"). When a GET request is made to this endpoint, the
code inside the callback function will be executed. In this case, it returns a JSON response with
the message "Bridge Inventory API" and a status code of 200. */
routes.get("/", (c) => c.json("Bridge Inventory API", 200));
// routes.route("/payload", payloadRoutes);
routes.route("/receipts", receiptRoutes);
routes.route("/send", sendSignatureRoutes);
routes.get(
  "/tokens",
  describeRoute({
    description:
      "Fetches and parses the tokens configuration from a remote URL",
    responses: {
      200: {
        description: "Returns tokens config",
        content: {
          "application/json": {
            schema: resolver(TokenConfigSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const data = await fetch(stageConfig.tokensConfigUrl).then((res) =>
      res.json()
    );
    return TokenConfigSchema.parse(data);
  }
);

export default routes;
