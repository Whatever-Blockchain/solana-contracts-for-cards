use anchor_spl::token::SetAuthority;

use crate::constant::ESCROW_PDA_SEED;
use crate::*;

pub fn handle(
    ctx: Context<Initialize>,
    _valut_acccount_bump: u8,
    initializer_amount: u64,
    taker_amount: u64,
) -> ProgramResult {
    // set escrow_account info
    ctx.accounts.escrow_account.initializer_key = *ctx.accounts.initializer.key;
    ctx.accounts
        .escrow_account
        .initializer_deposit_token_account = *ctx
        .accounts
        .initializer_deposit_token_account
        .to_account_info()
        .key;
    ctx.accounts
        .escrow_account
        .initializer_receive_token_account = *ctx
        .accounts
        .initializer_receive_token_account
        .to_account_info()
        .key;
    ctx.accounts.escrow_account.initializer_amount = initializer_amount;
    ctx.accounts.escrow_account.taker_amount = taker_amount;

    // get authority and bump for PDA
    let (vault_authority, _vault_authority_bump) =
        Pubkey::find_program_address(&[ESCROW_PDA_SEED], ctx.program_id);

    // owner를 vault_authority로 변경한다.
    token::set_authority(
        ctx.accounts.into_set_authority_context(),
        AuthorityType::AccountOwner,
        Some(vault_authority),
    )?;

    // transfer
    token::transfer(
        ctx.accounts.into_transfer_to_pda_context(),
        ctx.accounts.escrow_account.initializer_amount,
    )?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(vault_account_bump: u8, initializer_amount: u64)]
pub struct Initialize<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, signer)]
    pub initializer: AccountInfo<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        seeds = [b"token-seed".as_ref()],
        bump,
        payer = initializer,
        token::mint = mint,
        token::authority = initializer
    )]
    pub vault_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = initializer_deposit_token_account.amount >= initializer_amount
    )]
    pub initializer_deposit_token_account: Account<'info, TokenAccount>,
    pub initializer_receive_token_account: Account<'info, TokenAccount>,
    #[account(zero)]
    pub escrow_account: Box<Account<'info, EscrowAccount>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: AccountInfo<'info>,
}

impl<'info> Initialize<'info> {
    fn into_set_authority_context(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
        let cpi_accounts = SetAuthority {
            account_or_mint: self.vault_account.to_account_info().clone(),
            current_authority: self.initializer.clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }

    fn into_transfer_to_pda_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self
                .initializer_deposit_token_account
                .to_account_info()
                .clone(),
            to: self.vault_account.to_account_info().clone(),
            authority: self.initializer.clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }
}
