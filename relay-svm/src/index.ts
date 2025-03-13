import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import idl from "../../bridge-svm/target/idl/multisig_nonce.json";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const SOLANA_ENDPOINT_URL = process.env.SOLANA_ENDPOINT_URL;
const SOLANA_KEYPAIR = process.env.SOLANA_KEYPAIR;
const SOLANA_SIGNERS_PUBKEYS = process.env.SOLANA_SIGNERS_PUBKEYS;

const authorityPubkeys = JSON.parse(SOLANA_SIGNERS_PUBKEYS).map(
  (key: string) => new PublicKey(key),
);

const remainingAccounts = authorityPubkeys.map((pubkey: PublicKey) => ({
  pubkey,
  isSigner: true,
  isWritable: true,
}));

const secretKey = Uint8Array.from(JSON.parse(SOLANA_KEYPAIR));
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(SOLANA_KEYPAIR)),
);

const wallet = new Wallet(keypair);
const connection = new Connection(SOLANA_ENDPOINT_URL, "confirmed");
const provider = new AnchorProvider(connection, wallet, {
  preflightCommitment: "processed",
});
const program = new Program(idl as Idl, provider);

async function getSignature(tx: Transaction, signer: Keypair): Promise<string> {
  const signature = tx.signatures.find((sig) =>
    sig.publicKey.equals(signer.publicKey),
  )?.signature;

  if (!signature) {
    throw new Error("Signature is missing");
  }
  return signature.toString("base64");
}

async function serializeTransaction(tx: Transaction): Promise<string> {
  const serializedTx = tx
    .serialize({ requireAllSignatures: false })
    .toString("base64");
  return serializedTx;
}

async function deserializeTransaction(
  serializedTx: string,
): Promise<Transaction> {
  const tx = Transaction.from(Buffer.from(serializedTx, "base64"));
  return tx;
}

async function signTransaction(
  serializedTx: string,
  signatures: { publicKey: string; signature: string }[],
): Promise<string> {
  const tx = await deserializeTransaction(serializedTx);

  signatures.forEach(({ publicKey, signature }) => {
    tx.addSignature(new PublicKey(publicKey), Buffer.from(signature, "base64"));
  });

  if (!tx.verifySignatures()) {
    throw new Error("Signature verification failed");
  }
  return await serializeTransaction(tx);
}

async function unlockTokens(
  signer: Keypair,
  authority: PublicKey,
  client: PublicKey,
  from: PublicKey,
  to: PublicKey,
  nonce: PublicKey,
  amount: number,
  nonceValue: number,
): Promise<Transaction> {
  const tx = await program.methods
    .unlock(new BN(amount), new BN(nonceValue))
    .accounts({
      authority: authority,
      from,
      to,
      nonce,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .transaction();

  tx.feePayer = client;
  tx.partialSign(signer);
  return tx;
}
