const { payload2hash } = require("./utils/ethers/2Hash");
const { hashMessageEthers } = require("./utils/ethers/hashMessage");

if (process.argv.length < 11) {
  console.log('Usage: node payload2HashEthers.js <chainFrom> <chainTo> <tokenAddress> <externalTokenAddress> <amountToSend> <feeAmount> <timestamp> <flags> <flagData>');
  process.exit(1);
}
process.stdout.write(
  hashMessageEthers(
    payload2hash(
      process.argv[2],
      process.argv[3],
      process.argv[4],
      process.argv[5],
      process.argv[6],
      process.argv[7],
      process.argv[8],
      process.argv[9],
      process.argv[10]
    )
  )
);
