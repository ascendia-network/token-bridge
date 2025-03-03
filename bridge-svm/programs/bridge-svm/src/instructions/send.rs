use crate::structs::*;
use crate::utils::transfer::{burn_spl_from_user, transfer_spl_from_user, transfer_native_from_user};
use crate::utils::scale_amount;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    keccak::hash,
    sysvar::instructions::{get_instruction_relative, ID as SYSVAR_INSTRUCTIONS_ID},
};
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, TokenAccount};

#[derive(Accounts)]
pub struct Send<'info> {
    #[account(
        mut,
        constraint = !state.pause,
        seeds = [GlobalState::SEED_PREFIX], bump
    )]
    pub state: Account<'info, GlobalState>,

    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = sender,
    )]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [TokenConfig::SEED_PREFIX, mint.key().as_ref()], bump = bridge_token.bump
    )]
    pub bridge_token: Account<'info, TokenConfig>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bridge_token,
    )]
    pub bridge_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = SYSVAR_INSTRUCTIONS_ID)]
    pub ix_sysvar: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn send(ctx: Context<Send>, serialized_args: Vec<u8>, recipient: [u8; 20]) -> Result<()> {
    let args = SendPayload::try_from_slice(&serialized_args)
        .map_err(|_| error!(CustomError::InvalidSerialization))?;
    let args_hash = hash(&serialized_args);

    // check signature
    let ix = get_instruction_relative(-1, &ctx.accounts.ix_sysvar.to_account_info())?;
    let signed_message = &ix.data[ix.data.len().saturating_sub(32)..];
    let signer_pubkey = Pubkey::try_from_slice(
        &ix.data[ix.data.len().saturating_sub(32 + 32)..ix.data.len().saturating_sub(32)],
    );

    require!(
        signed_message == args_hash.to_bytes(),
        CustomError::InvalidSignature
    );
    require!(
        signer_pubkey? == ctx.accounts.state.send_signer,
        CustomError::InvalidSignature
    );

    require!(
        args.chain_from == SOLANA_CHAIN_ID,
        CustomError::InvalidArgs
    );
    require!(
        (Clock::get()?.unix_timestamp as u64) < args.timestamp + SIGNATURE_VALIDITY_TIME,
        CustomError::InvalidArgs
    );

    require!(
        ctx.accounts.mint.key() == args.token_address,
        CustomError::InvalidArgs
    );
    require!(
        ctx.accounts.bridge_token.amb_token == args.token_address_to,
        CustomError::InvalidArgs
    );

    // transfer fee to state PDA
    transfer_native_from_user(
        ctx.accounts.sender.to_account_info(),
        ctx.accounts.state.to_account_info(),
        args.fee_amount,
        ctx.accounts.system_program.to_account_info(),
    )?;

    if ctx.accounts.bridge_token.is_mintable {
        // burn token
        burn_spl_from_user(
            ctx.accounts.sender.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            args.amount_to_send,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.bridge_token.clone().into_inner(),
        )?;
    } else {
        // transfer token
        transfer_spl_from_user(
            ctx.accounts.sender.to_account_info(),
            ctx.accounts.sender_token_account.to_account_info(),
            ctx.accounts.bridge_token_account.clone().expect("no bridge ata").to_account_info(),
            args.amount_to_send,
            ctx.accounts.token_program.to_account_info(),
        )?;
    }

    // update nonce
    ctx.accounts.state.nonce += 1;

    emit!(SendEvent {
        from: ctx.accounts.sender.key(),
        to: recipient,
        token_address_from: ctx.accounts.mint.key(),
        token_address_to: args.token_address_to,
        amount_from: args.amount_to_send,
        amount_to: scale_amount(
            args.amount_to_send,
            ctx.accounts.mint.decimals,
            ctx.accounts.bridge_token.amb_decimals
        ),
        chain_from: SOLANA_CHAIN_ID,
        chain_to: AMB_CHAIN_ID,
        event_id: ctx.accounts.state.nonce, // transaction number
        flags: args.flags,
        flag_data: args.flag_data,
    });
    Ok(())
}
