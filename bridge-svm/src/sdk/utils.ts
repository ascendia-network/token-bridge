import { Buffer } from "buffer";
import { Connection, Keypair, PublicKey, type Signer, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";


export const SOLANA_CHAIN_ID = 0x736F6C616E61;
export const AMB_CHAIN_ID = 22040;


export function hexToUint8Array(hexString: string) {
  if (hexString.startsWith("0x"))
    hexString = hexString.slice(2); // Remove "0x" prefix if present
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  return bytes;
}

export function hexToKeypair(hexString: string) {
  return Keypair.fromSecretKey(hexToUint8Array(hexString));
}

export function keypairToHex(keypair: Keypair) {
  return Buffer.from(keypair.secretKey).toString('hex');
}


export function getBridgeAccounts(mint: PublicKey, bridgeProgramId: PublicKey) {
  const state_pda = getBridgeStateAccount(bridgeProgramId);
  const [ bridge_token_pda, bridge_token_ata ] = getBridgeTokenAccounts(mint, bridgeProgramId);

  return {
    mint: mint,

    bridgeToken: bridge_token_pda,
    bridgeTokenAccount: bridge_token_ata,
    state: state_pda,

    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  }
}


export async function getOrCreateUserATA(connection: Connection, user: Signer, token: PublicKey) {
  return (await getOrCreateAssociatedTokenAccount(connection, user, token, user.publicKey, undefined, undefined, {commitment: 'confirmed'})).address;
}

export function getUserNoncePda(user: PublicKey, bridgeProgramId: PublicKey) {
  const [nonceAccount] = PublicKey.findProgramAddressSync([Buffer.from("nonce"), user.toBuffer()], bridgeProgramId);
  return nonceAccount;
}

export function getBridgeStateAccount(bridgeProgramId: PublicKey) {
  const [state_pda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], bridgeProgramId);
  return state_pda
}

export function getBridgeTokenAccounts(token: PublicKey, bridgeProgramId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("token"), token.toBuffer()], bridgeProgramId)
  const ata = getAssociatedTokenAddressSync(token, pda, true);
  return [pda, ata]
}

