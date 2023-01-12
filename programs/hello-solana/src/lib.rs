use anchor_lang::prelude::*;

declare_id!("VT4xECAJb32gNheoLxYJnJksW4WxTgYW4v6A2Y2sYYv");

#[program]
pub mod hello_solana {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("Hello Solana!!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
