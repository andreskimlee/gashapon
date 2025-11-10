use anchor_lang::prelude::*;
use anchor_spl::associated_token::{self, AssociatedToken};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("4zHkHBrSyBsi2L5J1ikZ5kQwNcGMcE2x3wKrG3FY7UqC");

const PLATFORM_FEE_BPS: u16 = 200; // 2%

#[program]
pub mod gachapon_marketplace {
  use super::*;

  pub fn initialize_config(ctx: Context<InitializeConfig>, platform_treasury: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.admin.key();
    config.platform_treasury = platform_treasury;
    config.bump = ctx.bumps.config;
    Ok(())
  }

  pub fn update_config(
    ctx: Context<UpdateConfig>,
    new_platform_treasury: Option<Pubkey>,
    new_authority: Option<Pubkey>,
  ) -> Result<()> {
    let config = &mut ctx.accounts.config;
    if let Some(treasury) = new_platform_treasury {
      config.platform_treasury = treasury;
    }
    if let Some(auth) = new_authority {
      config.authority = auth;
    }
    Ok(())
  }

  pub fn list_nft(ctx: Context<ListNFT>, price_in_tokens: u64) -> Result<()> {
    require!(price_in_tokens > 0, ErrorCode::InvalidPrice);

    let listing = &mut ctx.accounts.listing;
    listing.seller = ctx.accounts.seller.key();
    listing.nft_mint = ctx.accounts.nft_mint.key();
    listing.currency_mint = ctx.accounts.currency_mint.key();
    listing.price_in_tokens = price_in_tokens;
    listing.is_active = true;
    listing.listed_at = Clock::get()?.unix_timestamp;
    listing.cancelled_at = None;
    listing.sold_at = None;
    listing.buyer = None;
    listing.bump = ctx.bumps.listing;

    // Ensure escrow ATA exists (created above via init_if_needed), then
    // transfer NFT (amount = 1) from seller to escrow
    let cpi_accounts = Transfer {
      from: ctx.accounts.seller_nft_token_account.to_account_info(),
      to: ctx.accounts.escrow_nft_token_account.to_account_info(),
      authority: ctx.accounts.seller.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, 1)?;

    emit!(NFTListed {
      seller: listing.seller,
      nft_mint: listing.nft_mint,
      price: listing.price_in_tokens,
      timestamp: listing.listed_at,
    });
    Ok(())
  }

  pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    require!(listing.is_active, ErrorCode::ListingInactive);

    // Transfer NFT back to seller from escrow (PDA signer)
    let bump = ctx.bumps.escrow_authority;
    let signer_seeds: &[&[u8]] = &[b"escrow", listing.nft_mint.as_ref(), &[bump]];
    let cpi_accounts = Transfer {
      from: ctx.accounts.escrow_nft_token_account.to_account_info(),
      to: ctx.accounts.seller_nft_token_account.to_account_info(),
      authority: ctx.accounts.escrow_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
      ctx.accounts.token_program.to_account_info(),
      cpi_accounts,
      &[signer_seeds],
    );
    token::transfer(cpi_ctx, 1)?;

    listing.is_active = false;
    listing.cancelled_at = Some(Clock::get()?.unix_timestamp);

    emit!(NFTDelisted {
      seller: listing.seller,
      nft_mint: listing.nft_mint,
      timestamp: listing.cancelled_at.unwrap(),
    });
    Ok(())
  }

  pub fn buy_nft(ctx: Context<BuyNFT>) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    require!(listing.is_active, ErrorCode::ListingInactive);
    require!(ctx.accounts.currency_mint.key() == listing.currency_mint, ErrorCode::InvalidCurrency);
    // Verify treasury account belongs to configured platform
    require!(
      ctx.accounts.platform_treasury_currency_token_account.owner == ctx.accounts.config.platform_treasury,
      ErrorCode::Unauthorized
    );

    // Calculate amounts
    let price = listing.price_in_tokens;
    let fee = (price as u128)
      .saturating_mul(PLATFORM_FEE_BPS as u128)
      .checked_div(10_000)
      .ok_or(ErrorCode::MathOverflow)? as u64;
    let seller_amount = price.checked_sub(fee).ok_or(ErrorCode::MathOverflow)?;

    // Transfer currency tokens: buyer -> seller
    let cpi_accounts1 = Transfer {
      from: ctx.accounts.buyer_currency_token_account.to_account_info(),
      to: ctx.accounts.seller_currency_token_account.to_account_info(),
      authority: ctx.accounts.buyer.to_account_info(),
    };
    let cpi_ctx1 = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts1);
    token::transfer(cpi_ctx1, seller_amount)?;

    // Transfer fee: buyer -> platform treasury
    let cpi_accounts2 = Transfer {
      from: ctx.accounts.buyer_currency_token_account.to_account_info(),
      to: ctx.accounts.platform_treasury_currency_token_account.to_account_info(),
      authority: ctx.accounts.buyer.to_account_info(),
    };
    let cpi_ctx2 = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts2);
    token::transfer(cpi_ctx2, fee)?;

    // Transfer NFT from escrow to buyer using PDA signer
    let bump = ctx.bumps.escrow_authority;
    let signer_seeds: &[&[u8]] = &[b"escrow", listing.nft_mint.as_ref(), &[bump]];
    let cpi_accounts3 = Transfer {
      from: ctx.accounts.escrow_nft_token_account.to_account_info(),
      to: ctx.accounts.buyer_nft_token_account.to_account_info(),
      authority: ctx.accounts.escrow_authority.to_account_info(),
    };
    let cpi_ctx3 = CpiContext::new_with_signer(
      ctx.accounts.token_program.to_account_info(),
      cpi_accounts3,
      &[signer_seeds],
    );
    token::transfer(cpi_ctx3, 1)?;

    listing.is_active = false;
    listing.sold_at = Some(Clock::get()?.unix_timestamp);
    listing.buyer = Some(ctx.accounts.buyer.key());

    emit!(NFTSold {
      seller: listing.seller,
      buyer: ctx.accounts.buyer.key(),
      nft_mint: listing.nft_mint,
      price: price,
      fee,
      timestamp: listing.sold_at.unwrap(),
    });
    Ok(())
  }

  pub fn update_listing_price(ctx: Context<UpdateListingPrice>, new_price_in_tokens: u64) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    require!(listing.is_active, ErrorCode::ListingInactive);
    require!(new_price_in_tokens > 0, ErrorCode::InvalidPrice);
    let old_price = listing.price_in_tokens;
    listing.price_in_tokens = new_price_in_tokens;
    emit!(PriceUpdated {
      nft_mint: listing.nft_mint,
      old_price,
      new_price: new_price_in_tokens,
      timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
  }

  pub fn withdraw_platform_fees(
    ctx: Context<WithdrawPlatformFees>,
    amount: u64,
  ) -> Result<()> {
    let config = &ctx.accounts.config;
    
    // Transfer tokens from platform treasury to destination
    let cpi_accounts = Transfer {
      from: ctx.accounts.platform_treasury_token_account.to_account_info(),
      to: ctx.accounts.destination_token_account.to_account_info(),
      authority: ctx.accounts.treasury_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    emit!(PlatformFeesWithdrawn {
      amount,
      destination: ctx.accounts.destination_token_account.key(),
      timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
  }
}

#[account]
pub struct Listing {
  pub seller: Pubkey,
  pub nft_mint: Pubkey,
  pub currency_mint: Pubkey,
  pub price_in_tokens: u64,
  pub is_active: bool,
  pub listed_at: i64,
  pub cancelled_at: Option<i64>,
  pub sold_at: Option<i64>,
  pub buyer: Option<Pubkey>,
  pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
  #[account(mut)]
  pub admin: Signer<'info>,
  #[account(
    init,
    payer = admin,
    space = 8 + 32 + 32 + 1,
    seeds = [b"config"],
    bump
  )]
  pub config: Account<'info, Config>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListNFT<'info> {
  #[account(mut)]
  pub seller: Signer<'info>,
  #[account(
    init,
    payer = seller,
    space = 8 + 256,
    seeds = [b"listing", nft_mint.key().as_ref()],
    bump
  )]
  pub listing: Account<'info, Listing>,
  pub nft_mint: Account<'info, Mint>,
  pub currency_mint: Account<'info, Mint>,
  #[account(
    mut,
    constraint = seller_nft_token_account.owner == seller.key(),
    constraint = seller_nft_token_account.mint == nft_mint.key()
  )]
  pub seller_nft_token_account: Account<'info, TokenAccount>,
  /// CHECK: PDA authority for escrow, derived and checked by seeds
  #[account(
    seeds = [b"escrow", nft_mint.key().as_ref()],
    bump
  )]
  pub escrow_authority: UncheckedAccount<'info>,
  #[account(
    init_if_needed,
    payer = seller,
    associated_token::mint = nft_mint,
    associated_token::authority = escrow_authority,
  )]
  pub escrow_nft_token_account: Account<'info, TokenAccount>,
  pub token_program: Program<'info, Token>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
  #[account(mut, has_one = seller)]
  pub listing: Account<'info, Listing>,
  pub seller: Signer<'info>,
  /// CHECK: PDA authority for escrow (validated manually in instruction)
  #[account(
    seeds = [b"escrow", listing.nft_mint.as_ref()],
    bump
  )]
  pub escrow_authority: UncheckedAccount<'info>,
  #[account(
    mut,
    constraint = escrow_nft_token_account.mint == listing.nft_mint,
    constraint = escrow_nft_token_account.owner == escrow_authority.key()
  )]
  pub escrow_nft_token_account: Account<'info, TokenAccount>,
  #[account(
    init_if_needed,
    payer = seller,
    associated_token::mint = listing.nft_mint,
    associated_token::authority = seller,
  )]
  pub seller_nft_token_account: Account<'info, TokenAccount>,
  pub token_program: Program<'info, Token>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyNFT<'info> {
  #[account(mut)]
  pub listing: Account<'info, Listing>,
  pub buyer: Signer<'info>,
  #[account(
    seeds = [b"config"],
    bump
  )]
  pub config: Account<'info, Config>,
  pub currency_mint: Account<'info, Mint>,
  #[account(
    init_if_needed,
    payer = buyer,
    associated_token::mint = currency_mint,
    associated_token::authority = buyer,
  )]
  pub buyer_currency_token_account: Account<'info, TokenAccount>,
  #[account(
    mut,
    constraint = seller_currency_token_account.mint == currency_mint.key()
  )]
  pub seller_currency_token_account: Account<'info, TokenAccount>,
  #[account(
    mut,
    constraint = platform_treasury_currency_token_account.mint == currency_mint.key()
  )]
  pub platform_treasury_currency_token_account: Account<'info, TokenAccount>,
  /// CHECK: PDA authority for escrow
  #[account(
    seeds = [b"escrow", listing.nft_mint.as_ref()],
    bump
  )]
  pub escrow_authority: UncheckedAccount<'info>,
  #[account(
    mut,
    constraint = escrow_nft_token_account.mint == listing.nft_mint,
    constraint = escrow_nft_token_account.owner == escrow_authority.key()
  )]
  pub escrow_nft_token_account: Account<'info, TokenAccount>,
  #[account(
    init_if_needed,
    payer = buyer,
    associated_token::mint = listing.nft_mint,
    associated_token::authority = buyer,
  )]
  pub buyer_nft_token_account: Account<'info, TokenAccount>,
  pub token_program: Program<'info, Token>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateListingPrice<'info> {
  #[account(mut, has_one = seller)]
  pub listing: Account<'info, Listing>,
  pub seller: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
  pub admin: Signer<'info>,
  #[account(
    mut,
    seeds = [b"config"],
    bump = config.bump,
    constraint = config.authority == admin.key() @ ErrorCode::Unauthorized
  )]
  pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct WithdrawPlatformFees<'info> {
  pub admin: Signer<'info>,
  #[account(
    seeds = [b"config"],
    bump = config.bump,
    constraint = config.authority == admin.key() @ ErrorCode::Unauthorized
  )]
  pub config: Account<'info, Config>,
  /// CHECK: Treasury authority must match config.platform_treasury owner
  #[account(mut)]
  pub treasury_authority: Signer<'info>,
  #[account(
    mut,
    constraint = platform_treasury_token_account.owner == treasury_authority.key(),
    constraint = platform_treasury_token_account.owner == config.platform_treasury
  )]
  pub platform_treasury_token_account: Account<'info, TokenAccount>,
  #[account(
    mut,
    constraint = destination_token_account.mint == platform_treasury_token_account.mint
  )]
  pub destination_token_account: Account<'info, TokenAccount>,
  pub token_program: Program<'info, Token>,
}

// Events
#[event]
pub struct NFTListed {
  pub seller: Pubkey,
  pub nft_mint: Pubkey,
  pub price: u64,
  pub timestamp: i64,
}

#[event]
pub struct NFTDelisted {
  pub seller: Pubkey,
  pub nft_mint: Pubkey,
  pub timestamp: i64,
}

#[event]
pub struct NFTSold {
  pub seller: Pubkey,
  pub buyer: Pubkey,
  pub nft_mint: Pubkey,
  pub price: u64,
  pub fee: u64,
  pub timestamp: i64,
}

#[event]
pub struct PriceUpdated {
  pub nft_mint: Pubkey,
  pub old_price: u64,
  pub new_price: u64,
  pub timestamp: i64,
}

#[event]
pub struct PlatformFeesWithdrawn {
  pub amount: u64,
  pub destination: Pubkey,
  pub timestamp: i64,
}

// Config
#[account]
pub struct Config {
  pub authority: Pubkey,
  pub platform_treasury: Pubkey,
  pub bump: u8,
}

// Errors
#[error_code]
pub enum ErrorCode {
  #[msg("Unauthorized")] Unauthorized,
  #[msg("Listing is inactive")] ListingInactive,
  #[msg("Invalid price")] InvalidPrice,
  #[msg("Invalid currency mint")] InvalidCurrency,
  #[msg("Math overflow")] MathOverflow,
}


