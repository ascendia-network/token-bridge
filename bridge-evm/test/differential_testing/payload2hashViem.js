const { payload2hash } = require("./utils/viem/2Hash");
const { hashMessageViem } = require("./utils/viem/hashMessage");

if (process.argv.length < 10) {
  console.log('Usage: node payload2HashViem.js <destChainId> <tokenAddress> <externalTokenAddress> <amountToSend> <feeAmount> <timestamp> <flags> <flagData>');
  process.exit(1);
}
process.stdout.write(
  hashMessageViem(
    payload2hash(
      process.argv[2],
      process.argv[3],
      process.argv[4],
      process.argv[5],
      process.argv[6],
      process.argv[7],
      process.argv[8],
      process.argv[9])
  )
);
