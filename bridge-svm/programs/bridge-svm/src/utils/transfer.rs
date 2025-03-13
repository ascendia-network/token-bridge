use crate::structs::TokenConfig;
use anchor_lang::context::CpiContext;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token_interface;

pub fn transfer_native_from_user<'a>(
    sender_info: AccountInfo<'a>,
    receiver_info: AccountInfo<'a>,
    amount: u64,
    system_program_info: AccountInfo<'a>,
) -> ProgramResult {
    let transfer_ix = system_instruction::transfer(sender_info.key, receiver_info.key, amount);
    let cpi_accounts = &[sender_info, receiver_info, system_program_info];
    anchor_lang::solana_program::program::invoke_signed(&transfer_ix, cpi_accounts, &[])
}

pub fn transfer_spl_from_user<'a>(
    authority_info: AccountInfo<'a>,
    sender_ata_info: AccountInfo<'a>,
    receiver_ata_info: AccountInfo<'a>,
    amount: u64,
    token_program_info: AccountInfo<'a>,
) -> Result<()> {
    let cpi_accounts = token_interface::Transfer {
        from: sender_ata_info,
        to: receiver_ata_info,
        authority: authority_info,
    };

    let cpi_ctx = CpiContext::new(token_program_info, cpi_accounts);
    token_interface::transfer(cpi_ctx, amount)
}

pub fn transfer_spl_to_user<'a>(
    authority_info: AccountInfo<'a>,
    sender_ata_info: AccountInfo<'a>,
    receiver_ata_info: AccountInfo<'a>,
    amount: u64,
    token_program_info: AccountInfo<'a>,
    bridge_token: TokenConfig,
) -> Result<()> {
    let cpi_accounts = token_interface::Transfer {
        from: sender_ata_info,
        to: receiver_ata_info,
        authority: authority_info,
    };
    let signer_seeds: &[&[&[u8]]] = &[&[
        TokenConfig::SEED_PREFIX,
        bridge_token.token.as_ref(),
        &[bridge_token.bump],
    ]];

    let cpi_ctx = CpiContext::new_with_signer(token_program_info, cpi_accounts, signer_seeds);
    token_interface::transfer(cpi_ctx, amount)
}

pub fn burn_spl_from_user<'a>(
    authority_info: AccountInfo<'a>,
    sender_ata_info: AccountInfo<'a>,
    mint_info: AccountInfo<'a>,
    amount: u64,
    token_program_info: AccountInfo<'a>,
    bridge_token: TokenConfig,
) -> Result<()> {
    let cpi_accounts = token_interface::Burn {
        mint: mint_info,
        from: sender_ata_info,
        authority: authority_info,
    };
    let signer_seeds: &[&[&[u8]]] = &[&[
        TokenConfig::SEED_PREFIX,
        bridge_token.token.as_ref(),
        &[bridge_token.bump],
    ]];

    let cpi_ctx = CpiContext::new_with_signer(token_program_info, cpi_accounts, signer_seeds);
    token_interface::burn(cpi_ctx, amount)
}

pub fn mint_spl_to_user<'a>(
    authority_info: AccountInfo<'a>,
    receiver_ata_info: AccountInfo<'a>,
    mint_info: AccountInfo<'a>,
    amount: u64,
    token_program_info: AccountInfo<'a>,
    bridge_token: TokenConfig,
) -> Result<()> {
    let cpi_accounts = token_interface::MintTo {
        mint: mint_info,
        to: receiver_ata_info,
        authority: authority_info,
    };
    let signer_seeds: &[&[&[u8]]] = &[&[
        TokenConfig::SEED_PREFIX,
        bridge_token.token.as_ref(),
        &[bridge_token.bump],
    ]];

    let cpi_ctx = CpiContext::new_with_signer(token_program_info, cpi_accounts, signer_seeds);
    token_interface::mint_to(cpi_ctx, amount)
}
