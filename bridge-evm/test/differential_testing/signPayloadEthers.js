const { ethers, getBytes, hashMessage, recoverAddress } = require("ethers");
const { payload2hash } = require("./utils/ethers/2Hash");

if (process.argv.length < 12) {
  console.log('Usage: node signPayloadEthers.js <chainFrom> <chainTo> <tokenAddress> <externalTokenAddress> <amountToSend> <feeAmount> <timestamp> <flags> <flagData> <privateKey>');
  process.exit(1);
}

async function signPayload(chainFrom, chainTo, tokenAddress, externalTokenAddress, amountToSend, feeAmount, timestamp, flags, flagData, privateKey) {
  const hash = payload2hash(chainFrom, chainTo, tokenAddress, externalTokenAddress, amountToSend, feeAmount, timestamp, flags, flagData);
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(getBytes(hash));

  console.assert(recoverAddress(getBytes(hashMessage(getBytes(hash))), signature) === wallet.address, "Invalid signature");
  return signature;
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
  process.argv[10],
  process.argv[11]
).then((signature) => {
  process.stdout.write(signature);
});
