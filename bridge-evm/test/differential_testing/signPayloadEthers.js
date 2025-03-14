const { ethers, getBytes } = require("ethers");
const { payload2hash } = require("./utils/ethers/2Hash");

if (process.argv.length < 11) {
  console.log('Usage: node signPayloadEthers.js <destChainId> <tokenAddress> <externalTokenAddress> <amountToSend> <feeAmount> <timestamp> <flags> <flagData> <privateKey>');
  process.exit(1);
}

async function signPayload(destChainId, tokenAddress, externalTokenAddress, amountToSend, feeAmount, timestamp, flags, flagData, privateKey) {
  const hash = payload2hash(destChainId, tokenAddress, externalTokenAddress, amountToSend, feeAmount, timestamp, flags, flagData);
  const wallet = new ethers.Wallet(privateKey);
  return wallet.signMessage(getBytes(hash));
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
