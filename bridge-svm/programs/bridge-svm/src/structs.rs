use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};



pub const SIGNATURE_VALIDITY_TIME: u64 = 30 * 60; // 30 minutes

pub const ZERO_PUBKEY: Pubkey = Pubkey::new_from_array([0u8; 32]);


#[cfg(feature = "mainnet")]
pub const SOLANA_CHAIN_ID: u64 = 0x534f4c414e410000; // "SOLANA" in hex
#[cfg(feature = "mainnet")]
pub const AMB_CHAIN_ID: u64 = 16718;


#[cfg(not(feature = "mainnet"))]
pub const SOLANA_CHAIN_ID: u64 = 0x534f4c414e41444e; // "SOLANADN" in hex
#[cfg(not(feature = "mainnet"))]
pub const AMB_CHAIN_ID: u64 = 22040;


#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub send_signer: Pubkey,
    pub receive_signer: Pubkey,
    pub nonce: u64,
    pub pause: bool,
}

impl GlobalState {
    pub const SEED_PREFIX: &'static [u8] = b"global_state";
    pub const ACCOUNT_SIZE: usize = 8 + 32 + 32 + 32 + 8 + 1;     // discriminator (8) + admin (32) + send_signer (32) + receive_signer (32) + nonce (8) + pause (1)
}


#[account]
pub struct TokenConfig {
    pub token: Pubkey,      // Public key of the token
    pub amb_token: [u8; 20],  // Address of the token on the AMB bridge
    pub amb_decimals: u8,       // Decimals of the token on the AMB bridge
    pub is_mintable: bool,    // True for synthetic tokens like SAMB, that come from AMB network and are minted on Solana by the bridge
    pub bump: u8,
}

impl TokenConfig {
    pub const SEED_PREFIX: &'static[u8] = b"token";
    pub const ACCOUNT_SIZE: usize = 8 + 32 + 20 + 1 + 1 + 1;

    pub fn new(token: Pubkey, amb_token: [u8; 20], amb_decimals: u8, is_mintable: bool, bump: u8) -> Self {
        Self { token, amb_token, amb_decimals, is_mintable, bump }
    }
}


#[account]
pub struct NonceAccount {
    pub nonce_counter: u64,
}

impl NonceAccount {
    pub const SEED_PREFIX: &'static [u8] = b"nonce";
    pub const ACCOUNT_SIZE: usize = 8 + 8;     // discriminator (8) + nonce (8)
}


#[error_code]
pub enum CustomError {
    #[msg("Signature invalid")]
    InvalidSignature,
    #[msg("Invalid nonce")]
    InvalidNonce,
    #[msg("Invalid token")]
    InvalidToken,
    #[msg("Invalid serialization")]
    InvalidSerialization,
    #[msg("Invalid input arguments")]
    InvalidArgs,
}


#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SendPayload {
    pub token_address: Pubkey,
    pub token_address_to: [u8; 20],
    pub amount_to_send: u64,
    pub fee_amount: u64,
    pub chain_from: u64,  // must be solana
    pub chain_to: u64,  // must be amb
    pub timestamp: u64,
    pub flags: [u8; 32],
    pub flag_data: Vec<u8>,
}

#[event]
// also ReceiveEvent
pub struct ReceivePayload {
    pub to: Pubkey,
    pub token_address_to: Pubkey,
    pub amount_to: u64,
    pub chain_from: u64,  // must be amb
    pub chain_to: u64,  // must be solana
    pub event_id: u64,
    pub flags: [u8; 32],
    pub flag_data: Vec<u8>,
}

#[event]
pub struct SendEvent {
    pub from: Pubkey,  // source address (bytes32 because of cross-chain compatibility)
    pub to: [u8; 20],  // destination address (bytes32 because of cross-chain compatibility)
    pub token_address_from: Pubkey,  // source token address (bytes32 because of cross-chain compatibility)
    pub token_address_to: [u8; 20],  // source token address (bytes32 because of cross-chain compatibility)
    pub amount_from: u64,  // amount of tokens sent
    pub amount_to: [u8; 32],  // amount of tokens received
    pub chain_from: u64,  // chain id of the source chain (must be solana)
    pub chain_to: u64,  // chain id of the destination chain (must be amb)
    pub event_id: u64,  // transaction number
    pub flags: [u8; 32],
    pub flag_data: Vec<u8>,
}
