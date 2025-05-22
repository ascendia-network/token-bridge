import { createV1, findMetadataPda, mplTokenMetadata, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { createSignerFromKeypair, percentAmount, publicKey, signerIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { AuthorityType, createMint, setAuthority } from "@solana/spl-token";
import NodeWallet from "@coral-xyz/anchor/dist/esm/nodewallet";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import idl from "./idl/idl.json";
import type { AmbSolBridge } from "./idl/idlType";
import { getBridgeTokenAccounts } from "./sdk/utils";

import sambKeypairPK from "../SAMBiNFocuZgLqkGHZbe2u6gugF861MdMkgrDdiuEpW.json";

const adminKeypairPK = []
const sambKeypair = Keypair.fromSecretKey(new Uint8Array(sambKeypairPK));
const admin = Keypair.fromSecretKey(new Uint8Array(adminKeypairPK));


const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
const wallet = new NodeWallet(admin);
const provider = new AnchorProvider(connection, wallet, {
  commitment: "processed",
});
setProvider(provider);

const program = new Program(idl as AmbSolBridge, provider);


async function deploy() {
  await createMint(connection, admin, admin.publicKey, undefined, 9, sambKeypair);
}

async function changeAuthorityFromBridge() {
  await program.methods.changeMintAuthority(admin.publicKey).accounts({
    mint: sambKeypair.publicKey,
  })
    .signers([admin])
    .rpc();
}


async function metadata() {

  const umi = createUmi("https://api.mainnet-beta.solana.com")
    .use(mplTokenMetadata())
    .use(mplToolbox());
  const umiAdmin = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(adminKeypairPK));
  const signer = createSignerFromKeypair(umi, umiAdmin);
  umi.use(signerIdentity(signer));

  const mint = publicKey(sambKeypair.publicKey);

  const tokenMetadata = {
    name: "SAMB",
    symbol: "SAMB",
    uri: "https://raw.githubusercontent.com/ascendia-network/token-bridge/main/bridge-svm/tokens/SAMB-metadata.json",
  };


  // derive the metadata account that will store our metadata data onchain
  const metadataAccountAddress = await findMetadataPda(umi, { mint: mint });

  const tx = await createV1(umi, {
    mint,
    authority: umi.identity,
    payer: umi.identity,
    updateAuthority: umi.identity,
    name: tokenMetadata.name,
    symbol: tokenMetadata.symbol,
    uri: tokenMetadata.uri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);

  let txSig = base58.deserialize(tx.signature);
  // console.log(`https://explorer.solana.com/tx/${txSig}?cluster=devnet`);

}


async function changeAuthority() {

  const payer = admin;
  const mint = sambKeypair.publicKey;
  const [bridgeTokenPDA] = getBridgeTokenAccounts(mint, program.programId);

  // 1. Change Mint Authority (MintTokens)
  console.log("\n1. Changing Mint Authority...");
  const tx = await setAuthority(
    connection,
    payer, // fee payer
    mint, // the mint address
    payer, // current mint authority
    AuthorityType.MintTokens, // type of authority
    bridgeTokenPDA, // new authority
    [], // multisig signers, if any
    undefined, // confirm options
  );

  console.log(`Mint authority changed. Tx: ${tx}`);
}

async function main() {
  // await changeAuthorityFromBridge()
  // await deploy()
  // await metadata()
  // await changeAuthority()

}

main()
