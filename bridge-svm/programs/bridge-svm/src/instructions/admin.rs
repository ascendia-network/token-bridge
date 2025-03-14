use crate::structs::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, TokenAccount};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = GlobalState::ACCOUNT_SIZE,
        seeds = [GlobalState::SEED_PREFIX], bump
    )]
    pub state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(
        has_one = admin,
        seeds = [GlobalState::SEED_PREFIX], bump
    )]
    pub state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = TokenConfig::ACCOUNT_SIZE,
        seeds = [TokenConfig::SEED_PREFIX, mint.key().as_ref()], bump
    )]
    pub bridge_token: Account<'info, TokenConfig>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = bridge_token,
    )]
    // Will be inited if non-mintable (non-synthetic).
    // If synthetic, there is no need for bridge to store tokens, so don't init it;
    // clients must pass null or programId of the bridge instead.
    pub bridge_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateState<'info> {
    #[account(
        has_one = admin,
        seeds = [GlobalState::SEED_PREFIX], bump
    )]
    pub state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn initialize(
    ctx: Context<Initialize>,
    send_signer: Pubkey,
    receive_signer: Pubkey,
) -> Result<()> {
    let state = &mut ctx.accounts.state;
    state.admin = ctx.accounts.admin.key();
    state.nonce = 0;
    state.pause = false;
    state.send_signer = send_signer;
    state.receive_signer = receive_signer;
    Ok(())
}

pub fn initialize_token(
    ctx: Context<CreateToken>,
    amb_token: [u8; 20],
    amb_decimals: u8,
    is_mintable: bool,
) -> Result<()> {
    let bridge_token = &mut ctx.accounts.bridge_token;

    require!(
        is_mintable == !ctx.accounts.bridge_token_account.is_some(),
        ErrorCode::RequireViolated
    );
    if is_mintable {
        require!(
            ctx.accounts.mint.mint_authority.expect("no mint authority") == bridge_token.key(),
            ErrorCode::RequireViolated
        );
    }

    bridge_token.set_inner(TokenConfig::new(
        ctx.accounts.mint.key(),
        amb_token,
        amb_decimals,
        is_mintable,
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
    let admin = &ctx.accounts.admin;

    // Ensure the vault has enough balance
    require!(
        **vault.to_account_info().lamports.borrow() >= amount,
        ErrorCode::RequireGteViolated
    );

    // Transfer SOL from vault to user
    **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **admin.to_account_info().try_borrow_mut_lamports()? += amount;

    Ok(())
}
