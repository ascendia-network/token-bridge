import { startAnvil } from "./tests/mocks/anvil.js";

export default async function (globalConfig, projectConfig) {
  // Set reference to anvil in order to kill it during teardown.
  if (process.env.NODE_ENV !== "ci") {
    console.warn("\nStarting anvil from setup\n");
    globalThis.__ANVIL__ = await startAnvil();
  }
};
