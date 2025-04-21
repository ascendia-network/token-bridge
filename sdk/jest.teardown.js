export default async function (globalConfig, projectConfig) {
  console.warn("Killing anvil from teardown");
  await globalThis.__ANVIL__.kill();
}
