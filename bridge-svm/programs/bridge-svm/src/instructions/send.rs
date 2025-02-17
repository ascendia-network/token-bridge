use crate::structs::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    keccak::hash,
    sysvar::instructions::{load_instruction_at_checked, ID as SYSVAR_INSTRUCTIONS_ID},
};
use anchor_spl::token::{self, Token, Transfer};
use anchor_spl::token_interface::{Mint, TokenAccount};

#[derive(Accounts)]
pub struct Send<'info> {
    #[account(
        mut,
        constraint = !state.pause,
        seeds = [GlobalState::SEED_PREFIX], bump
    )]
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
        seeds = [TokenConfig::SEED_PREFIX, mint.key().as_ref()], bump = bridge_token.bump
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

pub fn send(ctx: Context<Send>, serialized_args: Vec<u8>, recipient: [u8; 20]) -> Result<()> {
    let deserialized_args = SendPayload::try_from_slice(&serialized_args)
        .map_err(|_| error!(CustomError::InvalidSerialization))?;
    let args_hash = hash(&serialized_args);

    // check signature
    let ix = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar.to_account_info())?;
    let signed_message = &ix.data[ix.data.len().saturating_sub(32)..];
    let signer_pubkey = Pubkey::try_from_slice(
        &ix.data[ix.data.len().saturating_sub(32 + 32)..ix.data.len().saturating_sub(32)],
    );

    require!(
        signed_message == args_hash.to_bytes(),
        CustomError::InvalidSignature
    );
    require!(
        signer_pubkey? == ctx.accounts.state.send_signer,
        CustomError::InvalidSignature
    );

    require!(
        deserialized_args.chain_from == SOLANA_CHAIN_ID,
        CustomError::InvalidSignature
    );
    require!(
        (Clock::get()?.unix_timestamp as u64)
            < deserialized_args.timestamp + SIGNATURE_VALIDITY_TIME,
        CustomError::InvalidSignature
    );
    require!(
        ctx.accounts.mint.key() == deserialized_args.token_address,
        CustomError::InvalidSignature
    );
    require!(
        ctx.accounts.bridge_token.amb_token == deserialized_args.token_address_to,
        CustomError::InvalidSignature
    );

    // transfer fees (to state account, program-owned)
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.sender.key(),   // Sender
        &ctx.accounts.state.key(),    // Receiver (Program-owned account)
        deserialized_args.fee_amount, // Amount in lamports
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

    emit!(SendEvent {
        from: ctx.accounts.sender.key(),
        to: recipient,
        token_address_from: ctx.accounts.mint.key(),
        token_address_to: deserialized_args.token_address_to,
        amount_from: deserialized_args.amount_to_send,
        amount_to: scale_amount(deserialized_args.amount_to_send, 6, 18), // todo decimals
        chain_from: SOLANA_CHAIN_ID,
        chain_to: AMB_CHAIN_ID,
        event_id: ctx.accounts.state.nonce, // transaction number
        flags: deserialized_args.flags,
        flag_data: deserialized_args.flag_data,
    });
    Ok(())
}




fn scale_amount(num: u64, from_decimals: u32, to_decimals: u32) -> [u8; 32] {
    let factor = 10u128.pow((to_decimals as i32 - from_decimals as i32).abs() as u32);
    let mut lo = num as u128;

    if to_decimals > from_decimals {
        // Scale up
        let (new_lo, carry) = lo.overflowing_mul(factor);
        assert!(!carry);
        lo = new_lo;
    } else {
        lo /= factor
    }

    let mut bytes = [0u8; 32];
    let lo_bytes = lo.to_be_bytes();
    bytes[32 - lo_bytes.len()..].copy_from_slice(&lo_bytes);
    bytes
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scale_up() {
        let num = 1488_000_000;
        let from_decimals = 6;
        let to_decimals = 18;
        let result = scale_amount(num, from_decimals, to_decimals);
        let expected: [u8; 32] = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 170, 37, 244,
            60, 245, 64, 0, 0,
        ];
        assert_eq!(result, expected);
    }

    #[test]
    fn test_scale_down() {
        let num = 1_000_000_000_000;
        let from_decimals = 6;
        let to_decimals = 1;
        let result = scale_amount(num, from_decimals, to_decimals);
        let expected: [u8; 32] = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            152, 150, 128,
        ];
        assert_eq!(result, expected);
    }

    #[test]
    fn test_no_scale() {
        let num = 1_000_000;
        let from_decimals = 6;
        let to_decimals = 6;
        let result = scale_amount(num, from_decimals, to_decimals);
        let expected: [u8; 32] = [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            15, 66, 64,
        ];
        assert_eq!(result, expected);
    }
}
