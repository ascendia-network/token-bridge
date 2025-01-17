import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";

const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const programId = new PublicKey("YOUR_PROGRAM_ID");

// connection.onLogs(programId, (logs, context) => {
//   console.log("Program Logs:", logs.logs);
//   console.log("Slot:", context.slot);
// });

function f1() {
  console.log("ok");
}
f1();
// (async () => {
//   const version = await connection.getVersion();
//   console.log("Connection to cluster established:", version);
//   const epoch = await connection.getEpochInfo();
//   console.log("Epoch info", epoch);
// })();
