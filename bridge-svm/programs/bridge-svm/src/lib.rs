use anchor_lang::prelude::*;

pub mod structs;
pub mod instructions;
pub mod utils;

use crate::instructions::*;

declare_id!("ambav8knXhcnxFdp6nMg9HH6K9HjuS6noQNoRvNatCH");




#[program]
pub mod amb_sol_bridge {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, send_signer: Pubkey, receive_signer: Pubkey) -> Result<()> {
        instructions::initialize(ctx, send_signer, receive_signer)
    }

    pub fn initialize_token(ctx: Context<CreateToken>, amb_token: [u8; 20], amb_decimals: u8, is_mintable: bool) -> Result<()> {
        instructions::initialize_token(ctx, amb_token, amb_decimals, is_mintable)
    }

    pub fn set_pause(ctx: Context<UpdateState>, pause: bool) -> Result<()> {
        instructions::set_pause(ctx, pause)
    }

    pub fn send(ctx: Context<Send>, serialized_args: Vec<u8>, recipient: [u8; 20]) -> Result<()> {
        instructions::send(ctx, serialized_args, recipient)
    }

   pub fn receive(ctx: Context<Receive>, serialized_args: Vec<u8>) -> Result<()> {
        instructions::receive(ctx, serialized_args)
    }
}
