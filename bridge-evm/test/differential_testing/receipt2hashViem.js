const { fullReceipt2hash, miniReceipt2hash } = require("./utils/viem/2Hash");
const { hashMessageViem } = require("./utils/viem/hashMessage");

function help(mode) {
  const fullHelp = "node receipt2HashViem.js--full <from> <to> <tokenAddressFrom> <tokenAddressTo> <amountFrom> <amountTo> <chainFrom> <chainTo> <eventId> <flags> <data>"
  const miniHelp = "node receipt2HashViem.js--mini <to> <tokenAddressTo> <amountTo> <chainFrom> <chainTo> <eventId> <flags> <data>"
  console.log(`Usage: \n${mode === "full" ? fullHelp : miniHelp}`);
  process.exit(1);

}
let receipt2hash = "";
switch (process.argv[2]) {
  case '--full':
    if (process.argv.length < 14) {
      help("full");
      process.exit(1);
    };
    receipt2hash = fullReceipt2hash(
      process.argv[3], // from
      process.argv[4], // to
      process.argv[5], // tokenAddressFrom
      process.argv[6], // tokenAddressTo
      process.argv[7], // amountFrom
      process.argv[8], // amountTo
      process.argv[9], // chainFrom
      process.argv[10], // chainTo
      process.argv[11], // eventId
      process.argv[12], // flags
      process.argv[13] // data
    );
    break;
  case '--mini':
    if (process.argv.length < 11) {
      help("mini");
      process.exit(1);
    }
    receipt2hash = miniReceipt2hash(
      process.argv[3], // to
      process.argv[4], // tokenAddressTo
      process.argv[5], // amountTo
      process.argv[6], // chainFrom
      process.argv[7], // chainTo
      process.argv[8], // eventId
      process.argv[9], // flags
      process.argv[10] // data
    );
    break;
  default:
    help("full");
    help("mini");
    process.exit(1);
}
process.stdout.write(
  hashMessageViem(
    receipt2hash
  )
);