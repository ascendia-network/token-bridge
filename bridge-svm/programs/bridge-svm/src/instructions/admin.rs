use crate::structs::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Token};
use anchor_spl::token_interface::{ Mint, TokenAccount };

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init,seeds = [b"global_state"],bump,payer = admin,space = 992    )]
    pub state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}







#[derive(Accounts)]
pub struct CreateTokenAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        space = TokenConfig::ACCOUNT_SIZE,
        payer = signer,
        seeds = [TokenConfig::SEED_PREFIX.as_bytes(), mint.key().as_ref()],
        bump
    )]
    pub bridge_token: Account<'info, TokenConfig>,

    #[account(
        init,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = bridge_token,
    )]
    pub bridge_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,


    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct UpdateState<'info> {
    #[account(mut)]
    pub state: Account<'info, GlobalState>,

    #[account(mut, constraint = authority.key() == state.admin)]
    pub authority: Signer<'info>,
}


pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let state = &mut ctx.accounts.state;
    state.admin = ctx.accounts.admin.key();
    state.nonce = 0;
    state.pause = false;
    Ok(())
}

pub fn initialize_token(ctx: Context<CreateTokenAccount>, amb_token: [u8; 20]) -> Result<()> {
    let bridge_token = &mut ctx.accounts.bridge_token;

    bridge_token.set_inner(TokenConfig::new(
        ctx.accounts.mint.key(),
        amb_token,
        ctx.bumps.bridge_token,
    ));

    Ok(())
}

pub fn set_pause(ctx: Context<UpdateState>, pause: bool) -> Result<()> {
    ctx.accounts.state.pause = pause;
    Ok(())
}

pub fn withdraw(ctx: Context<UpdateState>, amount: u64) -> Result<()> {
    let vault = &ctx.accounts.state;
    let user = &ctx.accounts.authority;

    // Ensure the vault has enough balance
    require!(**vault.to_account_info().lamports.borrow() >= amount, ErrorCode::RequireGteViolated);

    // Transfer SOL from vault to user
    **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **user.to_account_info().try_borrow_mut_lamports()? += amount;

    Ok(())
}
