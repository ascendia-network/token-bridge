use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, SetAuthority, set_authority, };
use crate::structs::*;

use spl_token::instruction::AuthorityType;

#[derive(Accounts)]
pub struct ChangeMintAuthority<'info> {
    #[account(
        has_one = admin @ CustomError::NotAdmin,
        seeds = [GlobalState::SEED_PREFIX], bump
    )]
    pub state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [TokenConfig::SEED_PREFIX, mint.key().as_ref()], bump
    )]
    pub bridge_token: Account<'info, TokenConfig>,
    pub token_program: Program<'info, Token>,
}



pub fn change_mint_authority(
    ctx: Context<ChangeMintAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    let signer_seeds: &[&[&[u8]]] = &[&[
        TokenConfig::SEED_PREFIX,
        ctx.accounts.bridge_token.token.as_ref(),
        &[ctx.accounts.bridge_token.bump],
    ]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        SetAuthority {
            current_authority: ctx.accounts.bridge_token.to_account_info(),
            account_or_mint: ctx.accounts.mint.to_account_info(),
        },
        signer_seeds,
    );

    set_authority(
        cpi_ctx,
        AuthorityType::MintTokens,
        Some(new_authority),
    )?;

    Ok(())
}
