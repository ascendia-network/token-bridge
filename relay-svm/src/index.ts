import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import idl from "../../bridge-svm/target/idl/multisig_nonce.json";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);
const CONNECTION_URL = process.env.CONNECTION_URL;
const SOLANA_SECRET_KEY = process.env.SOLANA_SECRET_KEY;
const AUTHORITY_PUBKEYS = process.env.AUTHORITY_PUBKEYS;

const authorityPubkeys = JSON.parse(AUTHORITY_PUBKEYS).map(
  (key: string) => new PublicKey(key),
);
const remainingAccounts = authorityPubkeys.map((pubkey: PublicKey) => ({
  pubkey,
  isSigner: true,
  isWritable: false,
}));
const secretKey = Uint8Array.from(JSON.parse(SOLANA_SECRET_KEY));
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(SOLANA_SECRET_KEY)),
);
const wallet = new Wallet(keypair);
const connection = new Connection(CONNECTION_URL, "confirmed");
const provider = new AnchorProvider(connection, wallet, {
  preflightCommitment: "processed",
});
const program = new Program(idl as Idl, provider);

async function lockTokens(
  authority: Keypair,
  from: PublicKey,
  to: PublicKey,
  nonceAccount: PublicKey,
  amount: number,
  address: string,
): Promise<Transaction> {
  const tx = await program.methods
    .lock(new BN(amount), address)
    .accounts({
      authority: authority.publicKey,
      from,
      to,
      nonceAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([authority])
    .transaction();
  return tx;
}

async function unlockTokens(
  authority: Keypair,
  from: PublicKey,
  to: PublicKey,
  nonceAccount: PublicKey,
  amount: number,
  nonceValue: number,
  signers: Keypair[],
): Promise<Transaction> {
  const tx = new Transaction();
  const instruction = await program.methods
    .unlock(new BN(amount), new BN(nonceValue))
    .accounts({
      authority: authority.publicKey,
      from,
      to,
      nonceAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  tx.add(instruction);
  tx.partialSign(authority);
  return tx;
}

async function getSignature(
  tx: Transaction,
  authority: Keypair,
): Promise<string> {
  const signature = tx.signatures.find((sig) =>
    sig.publicKey.equals(authority.publicKey),
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

async function sendTransaction(
  serializedTx: string,
  signatures: { publicKey: string; signature: string }[],
) {
  const tx = await deserializeTransaction(serializedTx);

  signatures.forEach(({ publicKey, signature }) => {
    tx.addSignature(new PublicKey(publicKey), Buffer.from(signature, "base64"));
  });

  if (!tx.verifySignatures()) {
    throw new Error("Signature verification failed");
  }
  const txId = await sendAndConfirmTransaction(connection, tx, []);
  console.log(txId);
}
