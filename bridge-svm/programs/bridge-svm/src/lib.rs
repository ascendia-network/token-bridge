use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("GrDsFgHMrguqLqhb9JGvE26wTCbwPiLPhFGMsxeDt5Xd");

#[derive(Accounts)]
pub struct Bridge<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    #[account(mut)]
    pub nonce_account: Account<'info, NonceAccount>,

    pub token_program: Program<'info, Token>,
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
}

#[program]
pub mod multisig_nonce {
    use super::*;

    pub fn lock(ctx: Context<Bridge>, amount: u64, destination: String) -> Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        msg!(
            "Lock, token: {}, from: {}, to: {}, amount: {}, destination: {}",
            ctx.accounts.token_program.key(),
            ctx.accounts.from.key(),
            ctx.accounts.to.key(),
            amount,
            destination
        );
        Ok(())
    }

    pub fn unlock(ctx: Context<Bridge>, amount: u64, nonce_value: u64) -> Result<()> {
        let nonce = &mut ctx.accounts.nonce_account;
        if nonce_value != nonce.nonce_counter {
            return Err(ErrorCode::InvalidNonce.into());
        }

        let accounts = ctx.remaining_accounts;
        for account in accounts {
            if !account.is_signer {
                return Err(ErrorCode::MissingSignature.into());
            }
        }

        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        nonce.nonce_counter += 1;
        msg!(
            "Unlock, token: {}, from: {}, to: {}, amount: {}",
            ctx.accounts.token_program.key(),
            ctx.accounts.from.key(),
            ctx.accounts.to.key(),
            amount
        );
        Ok(())
    }
}
