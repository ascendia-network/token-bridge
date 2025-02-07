use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};
use anchor_spl::token_interface::{ Mint, TokenAccount};

#[derive(Accounts)]
pub struct Lock<'info> {
    #[account(        mut,        seeds = [b"global_state"],        bump,        constraint = !state.pause    )]
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
        seeds = [TokenConfig::SEED_PREFIX.as_bytes(), mint.key().as_ref()],
        bump = bridge_token.bump
    )]
    pub bridge_token: Account<'info, TokenConfig>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = bridge_token,
    )]
    pub bridge_token_account: InterfaceAccount<'info, TokenAccount>,



    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}





pub fn lock(ctx: Context<Lock>, amount: u64, destination: String) -> Result<()> {
    ctx.accounts.state.nonce += 1;

    // todo check token
    // todo check signature
    // todo fees

    let cpi_accounts = Transfer {
        from: ctx.accounts.sender_token_account.to_account_info(),
        to: ctx.accounts.bridge_token_account.to_account_info(),
        authority: ctx.accounts.sender.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    msg!(
        "Lock, token: {}, from: {}, amount: {}, destination: {}, nonce: {}",
        ctx.accounts.mint.key(),
        ctx.accounts.sender.key(),
        amount,
        destination,
        ctx.accounts.state.nonce
    );
    Ok(())
}
