use anchor_lang::prelude::*;
use anchor_spl::token::{self, MintTo, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG");

// Metaplex Token Metadata Program ID
// Mainnet: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
// Devnet: same program ID
// Base58: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
const METAPLEX_TOKEN_METADATA_PROGRAM_ID_BYTES: [u8; 32] = [
    11, 112, 101, 177, 227, 209, 124, 69, 56, 157, 82, 127, 107, 4, 195, 205,
    88, 184, 108, 115, 26, 160, 253, 181, 73, 182, 209, 188, 3, 248, 41, 70,
];
const METAPLEX_TOKEN_METADATA_PROGRAM_ID: Pubkey = Pubkey::new_from_array(METAPLEX_TOKEN_METADATA_PROGRAM_ID_BYTES);

#[program]
pub mod gachapon_game {
  use super::*;

  /// Initialize the program with an authority
  /// This must be called once before any games can be created
  pub fn initialize_program(ctx: Context<InitializeProgram>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.bump = ctx.bumps.config;
    Ok(())
  }

  /// Update the program authority (only current authority can call this)
  pub fn update_program_authority(
    ctx: Context<UpdateProgramAuthority>,
    new_authority: Pubkey,
  ) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = new_authority;
    Ok(())
  }

  pub fn initialize_game(
    ctx: Context<InitializeGame>,
    game_id: u64,
    name: String,
    description: String,
    image_url: String,
    cost_usd: u64,
    token_mint: Pubkey,
    prize_pool: Vec<PrizeConfig>,
  ) -> Result<()> {
    // Check that the caller is the program authority
    require!(
      ctx.accounts.authority.key() == ctx.accounts.config.authority,
      ErrorCode::Unauthorized
    );

    // Validate string lengths (conservative limits to stay under 10KB)
    require!(name.len() <= 50, ErrorCode::StringTooLong);
    require!(description.len() <= 150, ErrorCode::StringTooLong);
    require!(image_url.len() <= 150, ErrorCode::StringTooLong);
    
    // Validate prize string lengths
    for prize in &prize_pool {
      require!(prize.name.len() <= 50, ErrorCode::StringTooLong);
      require!(prize.description.len() <= 100, ErrorCode::StringTooLong);
      require!(prize.image_url.len() <= 150, ErrorCode::StringTooLong);
      require!(prize.metadata_uri.len() <= 150, ErrorCode::StringTooLong);
      require!(prize.physical_sku.len() <= 30, ErrorCode::StringTooLong);
    }
    
    // Limit number of prizes (each prize ~500 bytes, so max ~15 prizes to stay under 10KB)
    require!(prize_pool.len() <= 15, ErrorCode::TooManyPrizes);

    // Validate prize distribution
    // Allow probabilities to sum to less than 10,000 (enables win/loss)
    // Remaining probability = loss rate
    let mut sum: u32 = 0;
    let mut any_supply = false;
    for prize in &prize_pool {
      sum = sum
        .checked_add(prize.probability_bp as u32)
        .ok_or(ErrorCode::InvalidProbabilities)?;
      if prize.supply_remaining > 0 { any_supply = true; }
    }
    require!(sum <= 10_000, ErrorCode::InvalidProbabilities); // Changed: allow < 10,000
    require!(any_supply, ErrorCode::OutOfStock);

    let game = &mut ctx.accounts.game;
    game.authority = ctx.accounts.authority.key();
    game.game_id = game_id;
    game.name = name;
    game.description = description;
    game.image_url = image_url;
    game.token_mint = token_mint;
    game.cost_usd = cost_usd;
    game.treasury = ctx.accounts.treasury.key();
    game.prize_pool = prize_pool;
    game.total_plays = 0;
    game.is_active = true;
    game.last_random_value = [0u8; 32];
    game.bump = ctx.bumps.game;

    emit!(GameCreated {
      game_id,
      authority: game.authority,
      timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
  }

  pub fn play_game(ctx: Context<PlayGame>, token_amount: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.is_active, ErrorCode::GameInactive);
    require!(has_available_prize(&game.prize_pool), ErrorCode::OutOfStock);
    require!(token_amount > 0, ErrorCode::InvalidTokenAmount);

    // Transfer tokens from user to treasury
    // Note: Price verification is done off-chain by the indexer before calling finalize_play
    let cpi_accounts = Transfer {
      from: ctx.accounts.user_token_account.to_account_info(),
      to: ctx.accounts.treasury_token_account.to_account_info(),
      authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, token_amount)?;

    emit!(GamePlayInitiated {
      user: ctx.accounts.user.key(),
      game_id: game.game_id,
      token_amount,
      timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
  }

  pub fn finalize_play(ctx: Context<FinalizePlay>, random_value: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.is_active, ErrorCode::GameInactive);

    // Store values we need before mutable borrow
    let game_id = game.game_id;
    let user_key = ctx.accounts.user.key();
    
    // Try to select a prize (may return None if draw falls outside prize probability range)
    match select_prize_index(&game.prize_pool, &random_value) {
      Some(prize_index) => {
        // User won a prize
        let prize = &mut game.prize_pool[prize_index];
        require!(prize.supply_remaining > 0, ErrorCode::OutOfStock);
        
        // Store prize info before decrementing
        let prize_id = prize.prize_id;
        let prize_tier = prize.tier.clone();
        let metadata_uri = prize.metadata_uri.clone();
        let prize_name = prize.name.clone();
        
        // Decrement supply
        prize.supply_remaining = prize
          .supply_remaining
          .checked_sub(1)
          .ok_or(ErrorCode::MathOverflow)?;
        
        // Check if any prizes are still available
        let has_available = has_available_prize(&game.prize_pool);
        
        // Update game state
        game.total_plays = game.total_plays.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        game.last_random_value = random_value;
        
        if !has_available {
          game.is_active = false;
        }

        // Mint NFT using Metaplex CPI
        // Note: The mint account must be created before calling finalize_play
        // The mint authority must be set to the game PDA
        let nft_mint = mint_prize_nft(
            &ctx,
            &prize_name,
            &metadata_uri,
            &prize_tier,
            game_id,
            prize_id,
        )?;
        
        emit!(PrizeWon {
          user: user_key,
          game_id,
          prize_id,
          tier: prize_tier,
          nft_mint, // Include mint address in event
          random_value,
          timestamp: Clock::get()?.unix_timestamp,
        });
      }
      None => {
        // User lost (draw fell outside prize probability range)
        game.total_plays = game.total_plays.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        game.last_random_value = random_value;
        
        emit!(PlayLost {
          user: user_key,
          game_id,
          random_value,
          timestamp: Clock::get()?.unix_timestamp,
        });
      }
    }
    
    Ok(())
  }

  pub fn update_game_status(ctx: Context<UpdateGame>, is_active: bool) -> Result<()> {
    let game = &mut ctx.accounts.game;
    game.is_active = is_active;
    emit!(GameStatusUpdated {
      game_id: game.game_id,
      is_active,
      timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
  }

  pub fn replenish_prize_supply(
    ctx: Context<ReplenishPrizeSupply>,
    prize_id: u64,
    additional_supply: u32,
  ) -> Result<()> {
    let game = &mut ctx.accounts.game;
    
    // Store values we need before mutable borrow
    let game_id = game.game_id;
    
    // Find and update the prize
    let prize = game
      .prize_pool
      .iter_mut()
      .find(|p| p.prize_id == prize_id)
      .ok_or(ErrorCode::PrizeNotFound)?;
    prize.supply_total = prize
      .supply_total
      .checked_add(additional_supply)
      .ok_or(ErrorCode::MathOverflow)?;
    prize.supply_remaining = prize
      .supply_remaining
      .checked_add(additional_supply)
      .ok_or(ErrorCode::MathOverflow)?;

    // Store the new supply value before releasing the borrow
    let new_supply = prize.supply_remaining;
    
    // Now we can modify game.is_active since prize borrow is dropped
    if additional_supply > 0 {
      game.is_active = true;
    }

    emit!(SupplyReplenished {
      game_id,
      prize_id,
      new_supply,
      timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
  }

  pub fn withdraw_treasury(
    ctx: Context<WithdrawTreasury>,
    amount: u64,
  ) -> Result<()> {
    let game = &ctx.accounts.game;
    
    // Transfer tokens from treasury to destination
    let cpi_accounts = Transfer {
      from: ctx.accounts.treasury_token_account.to_account_info(),
      to: ctx.accounts.destination_token_account.to_account_info(),
      authority: ctx.accounts.treasury_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    emit!(TreasuryWithdrawn {
      game_id: game.game_id,
      amount,
      destination: ctx.accounts.destination_token_account.key(),
      timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
  }

  pub fn close_game(_ctx: Context<CloseGame>) -> Result<()> {
    // Account will be closed automatically by Anchor's close constraint
    // This function just needs to exist for the instruction
    Ok(())
  }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PrizeTier {
  Common,
  Uncommon,
  Rare,
  Legendary,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PrizeConfig {
  pub prize_id: u64,
  pub name: String,
  pub description: String,
  pub image_url: String,
  pub metadata_uri: String,
  pub physical_sku: String,
  pub tier: PrizeTier,
  pub probability_bp: u16,      // Probability in basis points (0-10000)
  pub cost_usd: u64,            // Cost/value of the prize in cents
  pub supply_total: u32,
  pub supply_remaining: u32,
}

#[account]
pub struct Config {
  pub authority: Pubkey,
  pub bump: u8,
}

#[account]
pub struct Game {
  pub authority: Pubkey,
  pub game_id: u64,
  pub name: String,              // Game name (max 64 chars)
  pub description: String,       // Game description (max 256 chars)
  pub image_url: String,         // Game image URL (max 200 chars)
  pub token_mint: Pubkey,
  pub cost_usd: u64,             // Cost per play in cents
  pub treasury: Pubkey,
  pub prize_pool: Vec<PrizeConfig>,
  pub total_plays: u64,
  pub is_active: bool,
  pub last_random_value: [u8; 32],
  pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeProgram<'info> {
  #[account(mut)]
  pub authority: Signer<'info>,
  #[account(
    init,
    payer = authority,
    space = 8 + 32 + 1,
    seeds = [b"config"],
    bump
  )]
  pub config: Account<'info, Config>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProgramAuthority<'info> {
  #[account(mut, has_one = authority @ ErrorCode::Unauthorized)]
  pub config: Account<'info, Config>,
  pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct InitializeGame<'info> {
  #[account(mut)]
  pub authority: Signer<'info>,
  #[account(
    seeds = [b"config"],
    bump = config.bump
  )]
  pub config: Account<'info, Config>,
  #[account(
    init,
    payer = authority,
    space = 10240, // Max allowed in inner instructions (10KB limit)
    seeds = [b"game", game_id.to_le_bytes().as_ref()],
    bump
  )]
  pub game: Account<'info, Game>,
  /// CHECK: validated off-chain/admin
  pub treasury: UncheckedAccount<'info>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlayGame<'info> {
  #[account(mut)]
  pub game: Account<'info, Game>,
  #[account(mut)]
  pub user: Signer<'info>,
  #[account(
    mut,
    constraint = user_token_account.owner == user.key(),
    constraint = user_token_account.mint == game.token_mint
  )]
  pub user_token_account: Account<'info, TokenAccount>,
  #[account(
    mut,
    constraint = treasury_token_account.mint == game.token_mint
  )]
  pub treasury_token_account: Account<'info, TokenAccount>,
  pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FinalizePlay<'info> {
  #[account(mut)]
  pub game: Account<'info, Game>,
  pub user: Signer<'info>,
  
  // NFT Minting accounts
  /// CHECK: Mint account for the NFT (must be created before calling finalize_play)
  /// The mint must have:
  /// - decimals = 0 (NFT standard)
  /// - mint_authority = game PDA (so we can mint tokens)
  /// - supply = 0 initially
  #[account(mut)]
  pub nft_mint: UncheckedAccount<'info>,
  /// CHECK: Metadata PDA account (created via Metaplex CPI)
  #[account(mut)]
  pub metadata: UncheckedAccount<'info>,
  /// CHECK: Master Edition PDA account (created via Metaplex CPI)
  #[account(mut)]
  pub master_edition: UncheckedAccount<'info>,
  /// CHECK: User's token account for the NFT
  #[account(mut)]
  pub user_nft_token_account: UncheckedAccount<'info>,
  
  // Required programs and accounts
  pub token_program: Program<'info, Token>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub system_program: Program<'info, System>,
  /// CHECK: Metaplex Token Metadata program
  pub metaplex_token_metadata_program: UncheckedAccount<'info>,
  /// CHECK: Rent sysvar
  pub rent: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdateGame<'info> {
  #[account(mut, has_one = authority)]
  pub game: Account<'info, Game>,
  pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReplenishPrizeSupply<'info> {
  #[account(mut, has_one = authority)]
  pub game: Account<'info, Game>,
  pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
  #[account(has_one = authority)]
  pub game: Account<'info, Game>,
  pub authority: Signer<'info>,
  /// CHECK: Treasury authority must match game.treasury owner
  #[account(mut)]
  pub treasury_authority: Signer<'info>,
  #[account(
    mut,
    constraint = treasury_token_account.mint == game.token_mint,
    constraint = treasury_token_account.owner == treasury_authority.key()
  )]
  pub treasury_token_account: Account<'info, TokenAccount>,
  #[account(
    mut,
    constraint = destination_token_account.mint == game.token_mint
  )]
  pub destination_token_account: Account<'info, TokenAccount>,
  pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseGame<'info> {
  #[account(
    mut,
    has_one = authority @ ErrorCode::Unauthorized,
    close = authority
  )]
  pub game: Account<'info, Game>,
  #[account(mut)]
  pub authority: Signer<'info>,
}

// Events
#[event]
pub struct GameCreated {
  pub game_id: u64,
  pub authority: Pubkey,
  pub timestamp: i64,
}

#[event]
pub struct GamePlayInitiated {
  pub user: Pubkey,
  pub game_id: u64,
  pub token_amount: u64,
  pub timestamp: i64,
}

#[event]
pub struct PrizeWon {
  pub user: Pubkey,
  pub game_id: u64,
  pub prize_id: u64,
  pub tier: PrizeTier,
  pub nft_mint: Pubkey,
  pub random_value: [u8; 32],
  pub timestamp: i64,
}

#[event]
pub struct PlayLost {
  pub user: Pubkey,
  pub game_id: u64,
  pub random_value: [u8; 32],
  pub timestamp: i64,
}

#[event]
pub struct GameStatusUpdated {
  pub game_id: u64,
  pub is_active: bool,
  pub timestamp: i64,
}

#[event]
pub struct SupplyReplenished {
  pub game_id: u64,
  pub prize_id: u64,
  pub new_supply: u32,
  pub timestamp: i64,
}

#[event]
pub struct TreasuryWithdrawn {
  pub game_id: u64,
  pub amount: u64,
  pub destination: Pubkey,
  pub timestamp: i64,
}

// Errors
#[error_code]
pub enum ErrorCode {
  #[msg("Invalid probabilities; must sum to <= 10000")] 
  InvalidProbabilities,
  #[msg("Game is inactive")] 
  GameInactive,
  #[msg("All prizes are out of stock")] 
  OutOfStock,
  #[msg("Invalid VRF result")] 
  InvalidVRF,
  #[msg("Unauthorized")] 
  Unauthorized,
  #[msg("Prize not found")] 
  PrizeNotFound,
  #[msg("Insufficient funds")] 
  InsufficientFunds,
  #[msg("Invalid token amount")] 
  InvalidTokenAmount,
  #[msg("Math overflow")] 
  MathOverflow,
  #[msg("String exceeds maximum length")]
  StringTooLong,
  #[msg("Too many prizes (max 15)")]
  TooManyPrizes,
}

// Helpers
fn has_available_prize(prizes: &Vec<PrizeConfig>) -> bool {
  prizes.iter().any(|p| p.supply_remaining > 0)
}

/// Mint a prize NFT using Metaplex Token Metadata program via CPI
fn mint_prize_nft(
    ctx: &Context<FinalizePlay>,
    name: &str,
    uri: &str,
    _tier: &PrizeTier,
    game_id: u64,
    _prize_id: u64,
) -> Result<Pubkey> {
    use anchor_spl::associated_token::get_associated_token_address;
    use mpl_token_metadata::{
        instructions::{
            CreateMetadataAccountV3Cpi, CreateMasterEditionV3Cpi,
            CreateMetadataAccountV3CpiAccounts, CreateMasterEditionV3CpiAccounts,
            CreateMetadataAccountV3InstructionArgs, CreateMasterEditionV3InstructionArgs,
        },
        types::DataV2,
    };
    
    let accounts = &ctx.accounts;
    
    // Store nft_mint key to avoid temporary value issues
    let nft_mint_key = accounts.nft_mint.key();
    
    // Verify Metaplex program
    require!(
        accounts.metaplex_token_metadata_program.key() == METAPLEX_TOKEN_METADATA_PROGRAM_ID,
        ErrorCode::Unauthorized
    );
    
    // Derive metadata PDA
    let nft_mint_bytes = nft_mint_key.as_ref();
    let metadata_seeds = &[
        b"metadata",
        METAPLEX_TOKEN_METADATA_PROGRAM_ID.as_ref(),
        nft_mint_bytes,
    ];
    let (metadata_pda, _metadata_bump) = Pubkey::find_program_address(
        metadata_seeds,
        &METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    );
    require!(
        accounts.metadata.key() == metadata_pda,
        ErrorCode::Unauthorized
    );
    
    // Derive master edition PDA
    let master_edition_seeds = &[
        b"metadata",
        METAPLEX_TOKEN_METADATA_PROGRAM_ID.as_ref(),
        nft_mint_bytes,
        b"edition",
    ];
    let (master_edition_pda, _master_edition_bump) = Pubkey::find_program_address(
        master_edition_seeds,
        &METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    );
    require!(
        accounts.master_edition.key() == master_edition_pda,
        ErrorCode::Unauthorized
    );
    
    // Verify user's token account is the associated token account
    let expected_ata = get_associated_token_address(&accounts.user.key(), &accounts.nft_mint.key());
    require!(
        accounts.user_nft_token_account.key() == expected_ata,
        ErrorCode::Unauthorized
    );
    
    // Derive game PDA bump for signing
    let (game_pda, game_bump) = Pubkey::find_program_address(
        &[b"game", &game_id.to_le_bytes()],
        ctx.program_id,
    );
    require!(
        accounts.game.key() == game_pda,
        ErrorCode::Unauthorized
    );
    
    // Game PDA seeds for signing
    let game_id_bytes = game_id.to_le_bytes();
    let game_bump_array = [game_bump];
    let game_seeds: &[&[u8]] = &[
        b"game",
        &game_id_bytes,
        &game_bump_array,
    ];
    
    // Build metadata data
    let data_v2 = DataV2 {
        name: name.to_string(),
        symbol: "PRIZE".to_string(),
        uri: uri.to_string(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };
    
    // Store AccountInfo values to avoid temporary value issues
    let metaplex_program_info = accounts.metaplex_token_metadata_program.to_account_info();
    let metadata_info = accounts.metadata.to_account_info();
    let mint_info = accounts.nft_mint.to_account_info();
    let game_info = accounts.game.to_account_info();
    let user_info = accounts.user.to_account_info();
    let system_program_info = accounts.system_program.to_account_info();
    let rent_info = accounts.rent.to_account_info();
    
    // Create metadata account using CPI builder
    let create_metadata_cpi = CreateMetadataAccountV3Cpi::new(
        &metaplex_program_info,
        CreateMetadataAccountV3CpiAccounts {
            metadata: &metadata_info,
            mint: &mint_info,
            mint_authority: &game_info,
            payer: &user_info,
            update_authority: (&game_info, true),
            system_program: &system_program_info,
            rent: Some(&rent_info),
        },
        CreateMetadataAccountV3InstructionArgs {
            data: data_v2,
            is_mutable: false,
            collection_details: None,
        },
    );
    
    // Invoke Metaplex instruction with game PDA as signer
    create_metadata_cpi.invoke_signed(&[game_seeds])?;
    
    // Store AccountInfo values for master edition (before minting)
    let master_edition_info = accounts.master_edition.to_account_info();
    let token_program_info = accounts.token_program.to_account_info();
    
    // Mint 1 token to user's token account FIRST
    // Master edition requires exactly 1 token to exist
    // Note: Mint authority must be set to game PDA for this to work
    let user_nft_token_account_info = accounts.user_nft_token_account.to_account_info();
    let cpi_accounts = MintTo {
        mint: accounts.nft_mint.to_account_info(),
        to: user_nft_token_account_info,
        authority: accounts.game.to_account_info(),
    };
    let signer_seeds: &[&[&[u8]]] = &[game_seeds];
    let cpi_ctx = CpiContext::new_with_signer(
        accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::mint_to(cpi_ctx, 1)?;
    
    // Create master edition AFTER minting the token
    // Master edition requires exactly 1 token to exist
    let create_master_edition_cpi = CreateMasterEditionV3Cpi::new(
        &metaplex_program_info,
        CreateMasterEditionV3CpiAccounts {
            edition: &master_edition_info,
            mint: &mint_info,
            update_authority: &game_info,
            mint_authority: &game_info,
            payer: &user_info,
            metadata: &metadata_info,
            token_program: &token_program_info,
            system_program: &system_program_info,
            rent: Some(&rent_info),
        },
        CreateMasterEditionV3InstructionArgs {
            max_supply: None,
        },
    );
    
    // Invoke master edition creation with game PDA as signer
    create_master_edition_cpi.invoke_signed(&[game_seeds])?;
    
    // Return mint address for event emission
    Ok(accounts.nft_mint.key())
}

fn select_prize_index(prizes: &Vec<PrizeConfig>, random_value: &[u8; 32]) -> Option<usize> {
  // Convert first 8 bytes to u64 and normalize to 0..=9999
  let rand_u64 = u64::from_le_bytes(random_value[0..8].try_into().unwrap());
  let draw = (rand_u64 % 10_000) as u16;
  let mut cumulative: u32 = 0;
  for (idx, prize) in prizes.iter().enumerate() {
    if prize.supply_remaining == 0 { continue; }
    cumulative += prize.probability_bp as u32;
    if (draw as u32) < cumulative {
      return Some(idx);
    }
  }
  None
}


