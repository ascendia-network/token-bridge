use anchor_lang::prelude::*;


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
    #[msg("Signature invalid.")]
    MissingSignature,
    #[msg("Invalid nonce.")]
    InvalidNonce,
    #[msg("Invalid token.")]
    InvalidToken,
}
