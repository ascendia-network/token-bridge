import { anvil } from 'prool/instances'

const instance = anvil({
  port: 8545,
  forkBlockNumber: 4288700,
  forkUrl: 'https://network-archive.ambrosus-test.io',
  forkRetryBackoff: 10000,
  retries: 10,
})

const MAX_RETRIES = 30;
const RETRY_DELAY = 10000;

export async function startAnvil(retries = 0) {
  try {
    if(instance.status != "started")
      await instance.start()
    return instance;
  } catch (err) {
    retries++;
    console.debug(`Anvil is not started succesfully, retrying... ${retries}/${MAX_RETRIES}`);
    console.error(err)
    if (retries > MAX_RETRIES) {
      throw new Error("Anvil is not started");
    } else {
      return await new Promise((resolve) => setTimeout(() => resolve(startAnvil(retries)), RETRY_DELAY));
    }
  }
}