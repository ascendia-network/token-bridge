use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("GrDsFgHMrguqLqhb9JGvE26wTCbwPiLPhFGMsxeDt5Xd");

#[derive(Accounts)]
pub struct Lock<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    #[account(mut, constraint = state.is_enable)]
    pub state: Account<'info, GlobalState>,
}

#[derive(Accounts)]
pub struct Unlock<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub from: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    #[account(mut)]
    pub nonce_account: Account<'info, NonceAccount>,

    pub token_program: Program<'info, Token>,

    #[account(mut, constraint = state.is_enable)]
    pub state: Account<'info, GlobalState>,
}

#[account]
#[derive(Default)]
pub struct NonceAccount {
    pub nonce_counter: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [b"global_state"],
        bump,
        payer = user,
        space = 992
    )]
    pub state: Account<'info, GlobalState>,

    #[account(mut)]
    pub user: Signer<'info>,

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
pub struct GlobalState {
    pub admin: Pubkey,
    pub nonce: u64,
    pub is_enable: bool,
    pub tokens: Vec<(Pubkey, String)>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Signature invalid.")]
    MissingSignature,
    #[msg("Invalid nonce.")]
    InvalidNonce,
    #[msg("Invalid account.")]
    InvalidAccount,
    #[msg("Invalid token.")]
    InvalidToken,
}

#[program]
pub mod multisig_nonce {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.admin = ctx.accounts.user.key();
        state.nonce = 0;
        state.is_enable = true;
        state.tokens = Vec::new();
        Ok(())
    }

    pub fn add_token(ctx: Context<UpdateState>, token: (Pubkey, String)) -> Result<()> {
        if ctx.accounts.state.tokens.len() < 12 {
            ctx.accounts.state.tokens.push(token.clone());
            msg!("Add token: {}", token.0);
        }
        Ok(())
    }

    pub fn delete_token(ctx: Context<UpdateState>, token: Pubkey) -> Result<()> {
        if let Some(index) = ctx.accounts.state.tokens.iter().position(|x| x.0 == token) {
            ctx.accounts.state.tokens.remove(index);
            msg!("Delete token: {}", token);
        }
        Ok(())
    }

    pub fn disable(ctx: Context<UpdateState>) -> Result<()> {
        ctx.accounts.state.is_enable = false;
        Ok(())
    }

    pub fn enable(ctx: Context<UpdateState>) -> Result<()> {
        ctx.accounts.state.is_enable = true;
        Ok(())
    }

    pub fn lock(ctx: Context<Lock>, amount: u64, destination: String) -> Result<()> {
        let (expected_pda, _) = Pubkey::find_program_address(&[b"global_state"], ctx.program_id);
        require!(
            ctx.accounts.state.key() == expected_pda,
            ErrorCode::InvalidAccount
        );

        ctx.accounts.state.nonce += 1;

        if !ctx
            .accounts
            .state
            .tokens
            .iter()
            .any(|(pubkey, _)| pubkey == &ctx.accounts.to.mint)
        {
            return Err(ErrorCode::InvalidToken.into());
        }

        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        msg!(
            "Lock, token: {}, from: {}, to: {}, amount: {}, destination: {}, nonce: {}",
            ctx.accounts.token_program.key(),
            ctx.accounts.from.key(),
            ctx.accounts.to.key(),
            amount,
            destination,
            ctx.accounts.state.nonce
        );
        Ok(())
    }

    pub fn unlock(ctx: Context<Unlock>, amount: u64, nonce_value: u64) -> Result<()> {
        let (expected_pda, _) = Pubkey::find_program_address(&[b"global_state"], ctx.program_id);
        require!(
            ctx.accounts.state.key() == expected_pda,
            ErrorCode::InvalidAccount
        );

        if ctx.accounts.nonce_account.to_account_info().owner != ctx.program_id {
            return Err(ErrorCode::InvalidNonce.into());
        }

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
