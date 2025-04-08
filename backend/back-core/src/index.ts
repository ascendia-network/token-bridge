import { logger } from "hono/logger";
import { routes } from "./routes";
import { prettyJSON } from "hono/pretty-json";
import { contextStorage } from "hono/context-storage";
import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { consoleLogger } from "./utils";
import { config } from "dotenv";
import { openAPISpecs } from "hono-openapi";
import { Hono } from "hono";

config();
process.env = { ...process.env };
export type Env = {
  Bindings: {
    DATABASE_URL: string;
    SEND_SIGNER_MNEMONIC: string;
    RELAY_ALLOWED_ORIGINS: string;
    ALLOWED_ORIGINS: string;
    [key: `RPC_URL_${number}`]: string;
  };
};

const app = new Hono<Env>({
  strict: false
});
app.use(logger(consoleLogger));
app.use(contextStorage());
app.use("*", prettyJSON());
app.get(
  "/openapi",
  openAPISpecs(app, {
    documentation: {
      info: {
        title: "Bridge API",
        version: "1.0.0",
        description: "API endpoints for the Bridge service"
      }
    }
  })
);
app.get("/ui", swaggerUI({ url: "/openapi" }));
app.route("/api", routes);
app.get("/health", (c) => {
  return c.json({ status: "ok" }, 200);
});

serve({
  fetch: app.fetch,
  port: 3000,
});
console.log("Server running on port 3000");

export default app;
