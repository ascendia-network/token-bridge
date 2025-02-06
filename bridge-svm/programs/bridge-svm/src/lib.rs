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
        associated_token::token_program	= token_program,
    )]
    pub bridge_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,


    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct TokenConfig {
    pub token: Pubkey,      // Public key of the token
    pub amb_token: [u8; 20],  //
    pub bump: u8,           // Nonce for the program-derived address
}

impl TokenConfig {
    pub const SEED_PREFIX: &'static str = "token";
    pub const ACCOUNT_SIZE: usize = 8 + 32 + 20 + 1;     // discriminator (8)  + Pubkey (32) + address (20)     + Bump (1) _
    pub fn new(token: Pubkey, amb_token: [u8; 20], bump: u8) -> Self {
        Self {            token,            amb_token,            bump,        }
    }
}


















#[derive(Accounts)]
pub struct Lock<'info> {
    #[account(        mut,        seeds = [b"global_state"],        bump,        constraint = state.is_enable    )]
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
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}







//
// #[derive(Accounts)]
// pub struct Unlock<'info> {
//     #[account(mut)]
//     pub authority: Signer<'info>,
//
//     #[account(mut)]
//     pub user: Signer<'info>,
//
//     #[account(mut)]
//     pub to: Account<'info, TokenAccount>,
//
//     #[account(
//         init_if_needed,
//         payer = user,
//         space = 16,
//         seeds = [user.key().as_ref()],
//         bump,
//     )]
//     pub nonce_account: Account<'info, NonceAccount>,
//
//     pub token_program: Program<'info, Token>,
//
//     #[account(
//         mut,
//         seeds = [b"global_state"],
//         bump,
//         owner = crate::ID,
//         constraint = state.is_enable
//     )]
//     pub state: Account<'info, GlobalState>,
//
//     pub system_program: Program<'info, System>,
// }

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

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub nonce: u64,
    pub is_enable: bool,
    // pub tokens: Vec<(Pubkey, String)>,
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
        state.is_enable = true;
        // state.tokens = Vec::new();
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

    // pub fn add_token(ctx: Context<UpdateState>, token: (Pubkey, String)) -> Result<()> {
    //     if ctx.accounts.state.tokens.len() < 12 {
    //         ctx.accounts.state.tokens.push(token.clone());
    //         msg!("Add token: {}", token.0);
    //     }
    //     Ok(())
    // }

    // pub fn delete_token(ctx: Context<UpdateState>, token: Pubkey) -> Result<()> {
    //     if let Some(index) = ctx.accounts.state.tokens.iter().position(|x| x.0 == token) {
    //         ctx.accounts.state.tokens.remove(index);
    //         msg!("Delete token: {}", token);
    //     }
    //     Ok(())
    // }
    //
    pub fn disable(ctx: Context<UpdateState>) -> Result<()> {
        ctx.accounts.state.is_enable = false;
        Ok(())
    }

    pub fn enable(ctx: Context<UpdateState>) -> Result<()> {
        ctx.accounts.state.is_enable = true;
        Ok(())
    }

    pub fn lock(ctx: Context<Lock>, amount: u64, destination: String) -> Result<()> {
        ctx.accounts.state.nonce += 1;
        // if !ctx
        //     .accounts
        //     .state
        //     .tokens
        //     .iter()
        //     .any(|(pubkey, _)| pubkey == &ctx.accounts.to.mint)
        // {
        //     return Err(ErrorCode::InvalidToken.into());
        // }

        let cpi_accounts = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.bridge_token_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        msg!(
            "Lock, token: {}, from: {}, amount: {}, destination: {}, nonce: {}",
            ctx.accounts.token_program.key(),
            ctx.accounts.sender.key(),
            amount,
            destination,
            ctx.accounts.state.nonce
        );
        Ok(())
    }

    // pub fn unlock(ctx: Context<Unlock>, amount: u64, nonce_value: u64) -> Result<()> {
    //     let nonce = &mut ctx.accounts.nonce_account;
    //     if nonce_value != nonce.nonce_counter {
    //         return Err(ErrorCode::InvalidNonce.into());
    //     }
    //
    //     let accounts = ctx.remaining_accounts;
    //     for account in accounts {
    //         if !account.is_signer {
    //             return Err(ErrorCode::MissingSignature.into());
    //         }
    //     }
    //
    //     let cpi_accounts = Transfer {
    //         from: ctx.accounts.from.to_account_info(),
    //         to: ctx.accounts.to.to_account_info(),
    //         authority: ctx.accounts.authority.to_account_info(),
    //     };
    //
    //     let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    //     token::transfer(cpi_ctx, amount)?;
    //
    //     nonce.nonce_counter += 1;
    //     msg!(
    //         "Unlock, token: {}, from: {}, to: {}, amount: {}",
    //         ctx.accounts.token_program.key(),
    //         ctx.accounts.from.key(),
    //         ctx.accounts.to.key(),
    //         amount
    //     );
    //     Ok(())
    // }
}
