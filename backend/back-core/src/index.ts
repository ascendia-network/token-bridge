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
import { buildRPCs, stageConfig } from "../config";
config();
process.env = { ...process.env, ...buildRPCs(stageConfig) };
export type Env = {
  Bindings: {
    DATABASE_URL: string;
    [key: `RPC_URL_${number}`]: string;
  };
};

const app = new Hono<Env>({
  strict: false,
 });
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
app.get("/health", (c) => {
  return c.json({ status: "ok" }, 200);
});

serve({
  fetch: app.fetch,
  port: 3000,
});
console.log("Server running on port 3000");

export default app;
