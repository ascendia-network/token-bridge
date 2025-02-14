use anchor_lang::prelude::*;

pub mod structs;
pub mod instructions;

use crate::instructions::*;

declare_id!("6TcA8kPmipG2xQtwYWQQq4CioTMbxHLjSCnpu1jqA6pZ");




#[program]
pub mod multisig_nonce {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, send_signer: Pubkey, receive_signer: Pubkey) -> Result<()> {
        instructions::initialize(ctx, send_signer, receive_signer)
    }

    pub fn initialize_token(ctx: Context<CreateTokenAccount>, amb_token: [u8; 20]) -> Result<()> {
        instructions::initialize_token(ctx, amb_token)
    }

    pub fn set_pause(ctx: Context<UpdateState>, pause: bool) -> Result<()> {
        instructions::set_pause(ctx, pause)
    }

    pub fn lock(ctx: Context<Lock>, serialized_args: Vec<u8>, recipient: [u8; 20]) -> Result<()> {
        instructions::lock(ctx, serialized_args, recipient)
    }

   pub fn unlock(ctx: Context<Unlock>, serialized_args: Vec<u8>) -> Result<()> {
        instructions::unlock(ctx, serialized_args)
    }
}
