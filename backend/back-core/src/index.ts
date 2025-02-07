import { logger } from "hono/logger";
import { routes } from "./routes";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { contextStorage } from "hono/context-storage";
import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { consoleLogger } from "./utils";
import { config } from "dotenv";
config();
export type Env = {
  DATABASE_URL: string;
  EVM_INDEXER_URL: string;
  SVM_INDEXER_URL: string;
  [key: `RPC_NODE_${number}`]: string;
};


const app = new OpenAPIHono<{ Bindings: Env }>({ strict: false });
app.use(logger(consoleLogger));
app.use(contextStorage());
app.use("*", prettyJSON());
app.get("/ui", swaggerUI({ url: "/doc" }));
app.use("/api/*", cors());
app.route("/api", routes);

serve({
  fetch: app.fetch,
  port: 3000
});
console.log("Server running on port 3000");

export default app;
