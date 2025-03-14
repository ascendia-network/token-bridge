const { signMessage } = require("viem/accounts");
const { toBytes  } = require("viem");
const { payload2hash } = require("./utils/viem/2Hash");

if (process.argv.length < 11) {
  console.log('Usage: node signPayloadViem.js <destChainId> <tokenAddress> <externalTokenAddress> <amountToSend> <feeAmount> <timestamp> <flags> <flagData> <privateKey>');
  process.exit(1);
}

async function signPayload(destChainId, tokenAddress, externalTokenAddress, amountToSend, feeAmount, timestamp, flags, flagData, privateKey) {
  const hash = payload2hash(destChainId, tokenAddress, externalTokenAddress, amountToSend, feeAmount, timestamp, flags, flagData);
  return signMessage({ privateKey, message: { raw: hash } });
}

signPayload(
  process.argv[2],
  process.argv[3],
  process.argv[4],
  process.argv[5],
  process.argv[6],
  process.argv[7],
  process.argv[8],
  process.argv[9],
  process.argv[10]
).then((signature) => {
  process.stdout.write(signature);
});
