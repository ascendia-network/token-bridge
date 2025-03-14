const { ethers, getBytes, recoverAddress, hashMessage } = require("ethers");
const { fullReceipt2hash, miniReceipt2hash } = require("./utils/ethers/2Hash");

async function signFullReceipt(from, to, tokenAddressFrom, tokenAddressTo, amountFrom, amountTo, chainFrom, chainTo, eventId, flags, data, privateKey) {
  const hash = fullReceipt2hash(
    from,
    to,
    tokenAddressFrom,
    tokenAddressTo,
    amountFrom,
    amountTo,
    chainFrom,
    chainTo,
    eventId,
    flags,
    data
  );
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(getBytes(hash));
  console.assert(recoverAddress(getBytes(hashMessage(getBytes(hash))), signature) === wallet.address, "Invalid signature");
  return signature;
}

async function signMiniReceipt(to, tokenAddressTo, amountTo, chainFrom, chainTo, eventId, flags, data, privateKey) {
  const hash = miniReceipt2hash(
    to,
    tokenAddressTo,
    amountTo,
    chainFrom,
    chainTo,
    eventId,
    flags,
    data
  );
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(getBytes(hash));
  console.assert(recoverAddress(getBytes(hashMessage(getBytes(hash))), signature) === wallet.address, "Invalid signature");
  return signature;
}

function help(mode) {
  const fullHelp = "node signReceiptEthers.js--full <from> <to> <tokenAddressFrom> <tokenAddressTo> <amountFrom> <amountTo> <chainFrom> <chainTo> <eventId> <flags> <data> <privateKey>"
  const miniHelp = "node signReceiptEthers.js--mini <to> <tokenAddressTo> <amountTo> <chainFrom> <chainTo> <eventId> <flags> <data> <privateKey>"
  console.log(`Usage: \n${mode === "full" ? fullHelp : miniHelp}`);
  process.exit(1);

}
let receipt2hash;
switch (process.argv[2]) {
  case '--full':
    if (process.argv.length < 15) {
      help("full");
      process.exit(1);
    };
    receipt2hash = signFullReceipt(
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
      process.argv[13], // data
      process.argv[14] // privateKey
    );
    break;
  case '--mini':
    if (process.argv.length < 12) {
      help("mini");
      process.exit(1);
    }
    receipt2hash = signMiniReceipt(
      process.argv[3], // to
      process.argv[4], // tokenAddressTo
      process.argv[5], // amountTo
      process.argv[6], // chainFrom
      process.argv[7], // chainTo
      process.argv[8], // eventId
      process.argv[9], // flags
      process.argv[10], // data
      process.argv[11] // privateKey
    );
    break;
  default:
    help("full");
    help("mini");
    process.exit(1);
}
receipt2hash.then((signature) => process.stdout.write(signature));