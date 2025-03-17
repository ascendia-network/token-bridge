const { privateKeyToAccount } = require("viem/accounts");
const { recoverMessageAddress } = require("viem");
const { payload2hash } = require("./utils/viem/2Hash");

if (process.argv.length < 12) {
  console.log('Usage: node signPayloadViem.js <chainFrom> <chainTo> <tokenAddress> <externalTokenAddress> <amountToSend> <feeAmount> <timestamp> <flags> <flagData> <privateKey>');
  process.exit(1);
}

async function signPayload(chainFrom, chainTo, tokenAddress, externalTokenAddress, amountToSend, feeAmount, timestamp, flags, flagData, privateKey) {
  const hash = payload2hash(chainFrom, chainTo, tokenAddress, externalTokenAddress, amountToSend, feeAmount, timestamp, flags, flagData);
  const account = privateKeyToAccount(privateKey);
  const signature = await account.signMessage({ message: { raw: hash } });
  console.assert(
      await recoverMessageAddress({
      message: { raw: hash },
      signature,
    }) === account.address, "Invalid signature");
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