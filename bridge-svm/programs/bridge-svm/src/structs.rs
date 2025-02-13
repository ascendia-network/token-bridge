use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};


#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub nonce: u64,
    pub pause: bool,
}




#[account]
pub struct TokenConfig {
    pub token: Pubkey,      // Public key of the token
    pub amb_token: [u8; 20],  //
    pub bump: u8,
}

impl TokenConfig {
    pub const SEED_PREFIX: &'static str = "token";
    pub const ACCOUNT_SIZE: usize = 8 + 32 + 20 + 1;     // discriminator (8)  + Pubkey (32) + address (20)     + Bump (1) _

    pub fn new(token: Pubkey, amb_token: [u8; 20], bump: u8) -> Self {
        Self { token, amb_token, bump }
    }
}


#[account]
pub struct NonceAccount {
    pub nonce_counter: u64,
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
    InvalidSerialization
}



#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SendPayload {
    pub token_address: Pubkey,
    pub token_address_to: [u8; 20],
    pub amount_to_send: u64,
    pub fee_amount: u64,
    pub chainFrom: u64,
    pub timestamp: u64,
    pub flags: [u8; 32],
    pub flag_data: Vec<u8>,
}


#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct ReceivePayload {
    pub to: Pubkey,
    pub token_address_to: Pubkey,
    pub amount_to: u64,
    pub chainTo: u64,
    pub flags: [u8; 32],
    pub flag_data: Vec<u8>,
    pub nonce: u64,
}
