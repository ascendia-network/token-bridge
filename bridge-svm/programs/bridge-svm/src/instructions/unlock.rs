use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};
use anchor_spl::token_interface::{ Mint, TokenAccount};


#[derive(Accounts)]
pub struct Unlock<'info> {
    #[account(        seeds = [b"global_state"],        bump,        constraint = !state.pause    )]
    pub state: Account<'info, GlobalState>,

    #[account(mut)]
    pub receiver: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = receiver,
    )]
    pub receiver_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = receiver,
        space = 16,
        seeds = [receiver.key().as_ref()],
        bump
    )]
    pub receiver_nonce_account: Account<'info, NonceAccount>,

    #[account(
        seeds = [TokenConfig::SEED_PREFIX.as_bytes(), mint.key().as_ref()],
        bump = bridge_token.bump
    )]
    pub bridge_token: Account<'info, TokenConfig>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bridge_token,
    )]
    pub bridge_token_account: InterfaceAccount<'info, TokenAccount>,


    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}





pub fn unlock(ctx: Context<Unlock>, amount: u64, nonce_value: u64) -> Result<()> {
    let nonce = &mut ctx.accounts.receiver_nonce_account;
    if nonce_value != nonce.nonce_counter {
        return Err(CustomError::InvalidNonce.into());
    }

    // todo check signature

    let bridge_token = &ctx.accounts.bridge_token;

    let seeds = &[TokenConfig::SEED_PREFIX.as_bytes(), bridge_token.token.as_ref(), &[bridge_token.bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.bridge_token_account.to_account_info(),
        to: ctx.accounts.receiver_token_account.to_account_info(),
        authority: ctx.accounts.bridge_token.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts,            signer_seeds        );
    token::transfer(cpi_ctx, amount)?;


    nonce.nonce_counter += 1;
    msg!(
        "Unlock, token: {}, to: {}, amount: {}",
        ctx.accounts.mint.key(),
        ctx.accounts.receiver.key(),
        amount
    );
    Ok(())
}
