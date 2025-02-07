use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;

use crate::instructions::*;

declare_id!("6TcA8kPmipG2xQtwYWQQq4CioTMbxHLjSCnpu1jqA6pZ");




#[program]
pub mod multisig_nonce {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    pub fn initialize_token(ctx: Context<CreateTokenAccount>, amb_token: [u8; 20]) -> Result<()> {
        instructions::initialize_token(ctx, amb_token)
    }

    pub fn set_pause(ctx: Context<UpdateState>, pause: bool) -> Result<()> {
        instructions::set_pause(ctx, pause)
    }

    pub fn lock(ctx: Context<Lock>, amount: u64, destination: String) -> Result<()> {
        instructions::lock(ctx, amount, destination)
    }

   pub fn unlock(ctx: Context<Unlock>, amount: u64, nonce_value: u64) -> Result<()> {
        instructions::unlock(ctx, amount, nonce_value)
    }
}
