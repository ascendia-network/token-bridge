use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Token, Transfer};
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface, };

declare_id!("6TcA8kPmipG2xQtwYWQQq4CioTMbxHLjSCnpu1jqA6pZ");

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(        init,        seeds = [b"global_state"],        bump,        payer = admin,        space = 992    )]
    pub state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub nonce: u64,
    pub pause: bool,
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

#[account]
pub struct TokenConfig {
    pub token: Pubkey,      // Public key of the token
    pub amb_token: [u8; 20],  //
    pub bump: u8,
}

impl TokenConfig {
    pub const SEED_PREFIX: &'static str = "token";
    pub const ACCOUNT_SIZE: usize = 8 + 32 + 20 + 1;     // discriminator (8)  + Pubkey (32) + address (20)     + Bump (1) _
    pub fn new(token: Pubkey, amb_token: [u8; 20], bump: u8) -> Self {
        Self {            token,            amb_token, bump           }
    }
}


















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



#[derive(Accounts)]
pub struct UpdateState<'info> {
    #[account(mut)]
    pub state: Account<'info, GlobalState>,

    #[account(mut, constraint = authority.key() == state.admin)]
    pub authority: Signer<'info>,
}

#[account]
#[derive(Default)]
pub struct NonceAccount {
    pub nonce_counter: u64,
}










#[error_code]
pub enum ErrorCode {
    #[msg("Signature invalid.")]
    MissingSignature,
    #[msg("Invalid nonce.")]
    InvalidNonce,
    #[msg("Invalid token.")]
    InvalidToken,
}

const ADMIN: &str = "";

#[program]
pub mod multisig_nonce {
    use super::*;
    use core::str::FromStr;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.admin = Pubkey::from_str(ADMIN).unwrap_or(ctx.accounts.admin.key());
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

   pub fn unlock(ctx: Context<Unlock>, amount: u64, nonce_value: u64) -> Result<()> {
        let nonce = &mut ctx.accounts.receiver_nonce_account;
        if nonce_value != nonce.nonce_counter {
            return Err(ErrorCode::InvalidNonce.into());
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
}
