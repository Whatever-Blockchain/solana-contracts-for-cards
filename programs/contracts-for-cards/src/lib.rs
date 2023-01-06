use anchor_lang::prelude::*;

declare_id!("VT4xECAJb32gNheoLxYJnJksW4WxTgYW4v6A2Y2sYYv");

#[program]
pub mod contracts_for_cards {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("Hello `Blockchain Cards to learn`");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
