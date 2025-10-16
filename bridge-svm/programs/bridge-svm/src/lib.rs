use anchor_lang::prelude::*;

pub mod instructions;
pub mod structs;
pub mod utils;

use crate::instructions::*;

declare_id!("ambZMSUBvU8bLfxop5uupQd9tcafeJKea1KoyTv2yM1");

#[program]
pub mod amb_sol_bridge {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        send_signer: Pubkey,
        receive_signer: Pubkey,
    ) -> Result<()> {
        instructions::initialize(ctx, send_signer, receive_signer)
    }

    pub fn initialize_token(
        ctx: Context<CreateToken>,
        amb_token: [u8; 20],
        amb_decimals: u8,
        is_mintable: bool,
    ) -> Result<()> {
        instructions::initialize_token(ctx, amb_token, amb_decimals, is_mintable)
    }

    pub fn set_pause(ctx: Context<UpdateState>, pause: bool) -> Result<()> {
        instructions::set_pause(ctx, pause)
    }
    pub fn set_signers(ctx: Context<UpdateState>, send_signer: Pubkey, receive_signer: Pubkey) -> Result<()> {
        instructions::set_signers(ctx, send_signer, receive_signer)
    }

    pub fn withdraw_fees(ctx: Context<UpdateState>, amount: u64) -> Result<()> {
        instructions::withdraw(ctx, amount)
    }




    pub fn send(ctx: Context<Send>, serialized_args: Vec<u8>, recipient: [u8; 20]) -> Result<()> {
        instructions::send(ctx, serialized_args, recipient)
    }

    pub fn receive(
        ctx: Context<Receive>,
        amount_to: u64,
        event_id: u64,
        flags: [u8; 32],
        flag_data: Vec<u8>,
    ) -> Result<()> {
        instructions::receive(ctx, amount_to, event_id, flags, flag_data)
    }

    pub fn change_mint_authority(ctx: Context<ChangeMintAuthority>, new_authority: Pubkey) -> Result<()> {
        instructions::change_mint_authority(ctx, new_authority)
    }
}
