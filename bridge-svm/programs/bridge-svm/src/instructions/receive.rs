use crate::structs::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    keccak::hash,
    sysvar::instructions::{load_instruction_at_checked, ID as SYSVAR_INSTRUCTIONS_ID},
};
use anchor_spl::token::{self, Token, Transfer};
use anchor_spl::token_interface::{Mint, TokenAccount};

#[derive(Accounts)]
pub struct Receive<'info> {
    #[account(
        constraint = !state.pause,
        seeds = [GlobalState::SEED_PREFIX], bump
    )]
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
        space = NonceAccount::ACCOUNT_SIZE,
        seeds = [NonceAccount::SEED_PREFIX, receiver.key().as_ref()], bump,
    )]
    pub receiver_nonce_account: Account<'info, NonceAccount>,

    #[account(
        seeds = [TokenConfig::SEED_PREFIX, mint.key().as_ref()], bump = bridge_token.bump
    )]
    pub bridge_token: Account<'info, TokenConfig>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bridge_token,
    )]
    pub bridge_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = SYSVAR_INSTRUCTIONS_ID)]
    pub ix_sysvar: AccountInfo<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn receive(ctx: Context<Receive>, serialized_args: Vec<u8>) -> Result<()> {
    let nonce = &mut ctx.accounts.receiver_nonce_account;
    let bridge_token = &ctx.accounts.bridge_token;

    let deserialized_args = ReceivePayload::try_from_slice(&serialized_args)
        .map_err(|_| error!(CustomError::InvalidSerialization))?;
    let args_hash = hash(&serialized_args);

    // check signature
    let num_signatures = 5;
    let ix = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar.to_account_info())?;
    let signed_message = &ix.data[ix.data.len().saturating_sub(32)..];
    let signer_pubkeys = &ix.data
        [ix.data.len().saturating_sub(32 * num_signatures + 32)..ix.data.len().saturating_sub(32)];
    let signer_pubkey = hash(signer_pubkeys);

    require!(
        signed_message == args_hash.to_bytes(),
        CustomError::InvalidSignature
    );
    require!(
        signer_pubkey.to_bytes() == ctx.accounts.state.receive_signer.to_bytes(),
        CustomError::InvalidSignature
    );

    require!(
        deserialized_args.nonce == nonce.nonce_counter,
        CustomError::InvalidNonce
    );
    require!(
        deserialized_args.chain_to == SOLANA_CHAIN_ID,
        CustomError::InvalidSignature
    );

    require!(
        ctx.accounts.mint.key() == deserialized_args.token_address_to,
        CustomError::InvalidSignature
    );

    // todo native token bridgring

    // transfer tokens
    let seeds = &[
        TokenConfig::SEED_PREFIX,
        bridge_token.token.as_ref(),
        &[bridge_token.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.bridge_token_account.to_account_info(),
        to: ctx.accounts.receiver_token_account.to_account_info(),
        authority: ctx.accounts.bridge_token.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, deserialized_args.amount_to)?;

    // update user nonce
    nonce.nonce_counter += 1;

    // event
    msg!(
        "Unlock, token: {}, to: {}, amount: {}",
        ctx.accounts.mint.key(),
        ctx.accounts.receiver.key(),
        deserialized_args.amount_to
    );
    Ok(())
}
