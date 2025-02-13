use crate::structs::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};
use anchor_spl::token_interface::{ Mint, TokenAccount};
use anchor_lang::solana_program::{
    sysvar::instructions::{load_instruction_at_checked, ID as SYSVAR_INSTRUCTIONS_ID},
    keccak::hash,
};



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





pub fn lock(ctx: Context<Lock>, serialized_args: Vec<u8>, recipient: [u8; 20]) -> Result<()> {
    let deserialized_args = SendPayload::try_from_slice(&serialized_args).map_err(|_| error!(CustomError::InvalidSerialization))?;
    let args_hash = hash(&serialized_args);



    // check signature
    let ix = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar.to_account_info())?;
    let signed_message = &ix.data[ix.data.len().saturating_sub(32)..];
    let signer_pubkey = Pubkey::try_from_slice(&ix.data[ix.data.len().saturating_sub(32+32)..ix.data.len().saturating_sub(32)]);

    require!(signed_message == args_hash.to_bytes(), CustomError::InvalidSignature);
    require!(signer_pubkey? == ctx.accounts.state.admin, CustomError::InvalidSignature);
    // todo check chain id
    // todo check timestamp
    // todo check token address



    // transfer fees (to state account, program-owned)
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.sender.key(),   // Sender
        &ctx.accounts.state.key(),  // Receiver (Program-owned account)
        deserialized_args.fee_amount,                      // Amount in lamports
    );
    anchor_lang::solana_program::program::invoke_signed(
        &transfer_ix,
        &[
            ctx.accounts.sender.to_account_info(),
            ctx.accounts.state.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[],
    )?;


    // todo native token bridgring

    // transfer token
    let cpi_accounts = Transfer {
        from: ctx.accounts.sender_token_account.to_account_info(),
        to: ctx.accounts.bridge_token_account.to_account_info(),
        authority: ctx.accounts.sender.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, deserialized_args.amount_to_send)?;


    // update nonce
    ctx.accounts.state.nonce += 1;

    // todo check token
    // todo check signature
    // todo fees


    msg!(
        "Lock, token: {}, from: {}, amount: {}, destination: {:x?}, nonce: {}",
        ctx.accounts.mint.key(),
        ctx.accounts.sender.key(),
        deserialized_args.amount_to_send,
        recipient,
        ctx.accounts.state.nonce
    );
    Ok(())
}
