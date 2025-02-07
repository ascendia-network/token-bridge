import { Hono } from "hono";
// import payloadRoutes from "./payload";
import receiptRoutes from "./receipt";
export const routes = new Hono();

/* The code `routes.get("/", (c) => c.json("Bridge Inventory API", 200));` is defining a route for
handling GET requests to the root endpoint ("/"). When a GET request is made to this endpoint, the
code inside the callback function will be executed. In this case, it returns a JSON response with
the message "Bridge Inventory API" and a status code of 200. */
routes.get("/", (c) => c.json("Bridge Inventory API", 200));
// routes.route("/payload", payloadRoutes);
routes.route("/receipts", receiptRoutes);

export default routes;


