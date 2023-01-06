use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_spl::token;
use anchor_spl::token::{Mint, TokenAccount, Transfer};
use spl_token::instruction::AuthorityType;

mod constant;
mod instructions;
mod state;

use instructions::*;
use state::*;
// use constant::escrow_constant;

declare_id!("5K8XyZfcTir7V57zbYrYRrLZmYMKkc7jjX6wGz1TT8eD");

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        _valut_acccount_bump: u8,
        initializer_amount: u64,
           taker_amount: u64,
    ) -> ProgramResult {
        initialize::handle(ctx, _valut_acccount_bump, initializer_amount, taker_amount)
    }

    pub fn cancel(ctx: Context<Cancel>) -> ProgramResult {
        cancel::handle(ctx)
    }

    pub fn exchange(ctx: Context<Exchange>) -> ProgramResult {
        exchange::handle(ctx)
    }
}
