import { ethers } from "ethers";
import { Config } from "./init";

//TODO: rewrite this (? use WS instead of HTTP long-polling)
const config = new Config();
const provider = new ethers.JsonRpcProvider(config.evmApiUrl);
const evmABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "to", type: "string" },
      { indexed: false, name: "token", type: "string" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "txHash", type: "bytes32" }
    ],
    name: "TokensLocked",
    type: "event"
  }
];

async function checkConnection() {
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log("Connected to evm node. Current block number:", blockNumber);
  } catch (error) {
    console.error("Failed to connect to evm node:", error);
  }
}

checkConnection();

const wallet = new ethers.Wallet(config.evmPrivateKey, provider);
const contract = new ethers.Contract(config.evmContractAddress, evmABI, wallet);

contract.on(
  "TokensLocked",
  async (
    to: string,
    token: string,
    amount: BigInt,
    txHash: string,
    event: any
  ) => {
    const abiCoder = new ethers.AbiCoder();
    const encodedMessage = abiCoder.encode(
      ["string", "string", "uint256", "bytes32"],
      [to, token, amount, txHash]
    );

    const messageHash = ethers.keccak256(encodedMessage);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    sendSignatureToBackend(to, token, amount, txHash, signature);
    console.log(ethers.getBytes(messageHash));
    console.log(
      "Address:",
      ethers.verifyMessage(ethers.getBytes(messageHash), signature)
    );
  }
);

async function sendSignatureToBackend(
  to: string,
  token: string,
  amount: BigInt,
  txHash: string,
  signature: string
) {
  const data = {
    to,
    token,
    amount: amount.toString(),
    txHash,
    signature
  };
  try {
    const response = await fetch(config.signatureStorage, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      console.log("Signature successfully sent to the backend.");
    } else {
      console.error(
        "Failed to send signature to backend. Response:",
        await response.text()
      );
    }
  } catch (error) {
    console.error("Error sending signature to backend:", error);
  }
}
