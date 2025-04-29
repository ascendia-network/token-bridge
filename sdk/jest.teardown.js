export default async function (globalConfig, projectConfig) {
  if (process.env.NODE_ENV != "ci") {
    console.warn("\nStopping anvil from teardown\n");
    await globalThis.__ANVIL__.stop();
  }
}
