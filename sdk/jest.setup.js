import { startAnvil } from "./tests/mocks/anvil.js";

export default async function (globalConfig, projectConfig) {
  // Set reference to anvil in order to kill it during teardown.
  console.warn("Starting anvil from setup");
  globalThis.__ANVIL__ = await startAnvil();
};
