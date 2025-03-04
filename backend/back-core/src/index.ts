import { logger } from "hono/logger";
import { routes } from "./routes";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { contextStorage } from "hono/context-storage";
import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { consoleLogger } from "./utils";
import { config } from "dotenv";
import { openAPISpecs } from "hono-openapi";
import { Hono } from "hono";
config();
export type Env = {
  DATABASE_URL: string;
  EVM_INDEXER_URL: string;
  SVM_INDEXER_URL: string;
  [key: `RPC_NODE_${number}`]: string;
};


const app = new Hono<{ Bindings: Env }>({ strict: false });
app.use(logger(consoleLogger));
app.use(contextStorage());
app.use("*", prettyJSON());
app.get(
  "/openapi",
  openAPISpecs(app, {
    documentation: {
      info: {
        title: "Hono API",
        version: "1.0.0",
        description: "Greeting API",
      },
      servers: [{ url: "http://localhost:3000", description: "Local Server" }],
    },
  })
);
app.get("/ui", swaggerUI({ url: "/openapi" }));
app.use("/api/*", cors());
app.route("/api", routes);

serve({
  fetch: app.fetch,
  port: 3000
});
console.log("Server running on port 3000");

export default app;
