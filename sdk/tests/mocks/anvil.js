import * as child from "child_process";

const MAX_RETRIES = 30;
const RETRY_DELAY = 10000;

export async function startAnvil() {
  const anvil = child.spawn("anvil", [
    "-p",
    "8545",
    "--fork-block-number",
    "4000000",
    "-f",
    "https://network-archive.ambrosus-test.io",
    "--silent",
  ]);
  anvil.stdout.on("data", (data) => {
    console.log(`[ANVIL] ${data}`);
  });
  await waitForAnvil();
  return anvil;
}

export async function waitForAnvil(retries = 0) {
  try {
    const url = `http://127.0.0.1:8545`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      }),
    });
    return response.ok && (await response.json()) !== undefined;
  } catch {
    retries++;
    console.debug(`Anvil is not ready yet, retrying... ${retries}/${MAX_RETRIES}`);
    if (retries > MAX_RETRIES) {
      throw new Error("Anvil is not ready");
    } else {
      return await new Promise((resolve) => {
        setTimeout(() => resolve(waitForAnvil(retries)), RETRY_DELAY);
      });
    }
  }
}
