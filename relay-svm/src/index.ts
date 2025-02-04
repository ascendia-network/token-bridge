import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  TransactionSignature,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import idl from "../../bridge-svm/target/idl/multisig_nonce.json";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();
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

async function lockTokens(
  authority: Keypair,
  from: PublicKey,
  to: PublicKey,
  amount: number,
  address: string,
): Promise<Transaction> {
  const tx = await program.methods
    .lock(new BN(amount), address)
    .accounts({
      authority: authority.publicKey,
      from,
      to,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction();
  tx.partialSign(authority);
  return tx;
}

async function unlockTokens(
  signer: Keypair,
  authority: PublicKey,
  client: PublicKey,
  from: PublicKey,
  to: PublicKey,
  nonceAccount: PublicKey,
  amount: number,
  nonceValue: number,
): Promise<Transaction> {
  const tx = await program.methods
    .unlock(new BN(amount), new BN(nonceValue))
    .accounts({
      authority: authority,
      from,
      to,
      nonceAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .transaction();

  tx.feePayer = client;
  tx.partialSign(signer);
  return tx;
}
