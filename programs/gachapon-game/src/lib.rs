use anchor_lang::prelude::*;
use anchor_spl::token::{self, MintTo, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG");

// Maximum number of prizes per game
pub const MAX_PRIZES: usize = 16;

// Metaplex Token Metadata Program ID
const METAPLEX_TOKEN_METADATA_PROGRAM_ID_BYTES: [u8; 32] = [
    11, 112, 101, 177, 227, 209, 124, 69, 56, 157, 82, 127, 107, 4, 195, 205,
    88, 184, 108, 115, 26, 160, 253, 181, 73, 182, 209, 188, 3, 248, 41, 70,
];
const METAPLEX_TOKEN_METADATA_PROGRAM_ID: Pubkey = Pubkey::new_from_array(METAPLEX_TOKEN_METADATA_PROGRAM_ID_BYTES);

#[program]
pub mod gachapon_game {
    use super::*;

    /// Initialize the program with an authority
    pub fn initialize_program(ctx: Context<InitializeProgram>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Update the program authority
    pub fn update_program_authority(
        ctx: Context<UpdateProgramAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        ctx.accounts.config.authority = new_authority;
        Ok(())
    }

    /// Initialize a new game (without prizes - add them separately)
    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        game_id: u64,
        name: String,
        description: String,
        image_url: String,
        cost_usd: u64,
        token_mint: Pubkey,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.config.authority,
            ErrorCode::Unauthorized
        );

        // Validate string lengths
        require!(name.len() <= 50, ErrorCode::StringTooLong);
        require!(description.len() <= 200, ErrorCode::StringTooLong);
        require!(image_url.len() <= 200, ErrorCode::StringTooLong);

        let game = &mut ctx.accounts.game;
        game.authority = ctx.accounts.authority.key();
        game.game_id = game_id;
        game.name = name;
        game.description = description;
        game.image_url = image_url;
        game.token_mint = token_mint;
        game.cost_usd = cost_usd;
        game.treasury = ctx.accounts.treasury.key();
        game.prize_count = 0;
        game.prize_probabilities = [0u16; MAX_PRIZES];
        game.total_supply_remaining = 0;
        game.total_plays = 0;
        game.is_active = false; // Inactive until prizes are added
        game.last_random_value = [0u8; 32];
        game.bump = ctx.bumps.game;

        emit!(GameCreated {
            game_id,
            authority: game.authority,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Add a prize to a game
    pub fn add_prize(
        ctx: Context<AddPrize>,
        prize_index: u8,
        prize_id: u64,
        name: String,
        description: String,
        image_url: String,
        metadata_uri: String,
        physical_sku: String,
        tier: PrizeTier,
        probability_bp: u16,
        cost_usd: u64,
        weight_grams: u32,
        supply_total: u32,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        // Validate
        require!(prize_index < MAX_PRIZES as u8, ErrorCode::TooManyPrizes);
        require!(prize_index == game.prize_count, ErrorCode::InvalidPrizeIndex); // Must add sequentially
        require!(name.len() <= 50, ErrorCode::StringTooLong);
        require!(description.len() <= 150, ErrorCode::StringTooLong);
        require!(image_url.len() <= 200, ErrorCode::StringTooLong);
        require!(metadata_uri.len() <= 200, ErrorCode::StringTooLong);
        require!(physical_sku.len() <= 50, ErrorCode::StringTooLong);
        
        // Check total probability doesn't exceed 10000
        let current_total: u32 = game.prize_probabilities.iter().map(|&p| p as u32).sum();
        require!(current_total + probability_bp as u32 <= 10_000, ErrorCode::InvalidProbabilities);

        // Initialize prize account
        let prize = &mut ctx.accounts.prize;
        prize.game = game.key();
        prize.prize_index = prize_index;
        prize.prize_id = prize_id;
        prize.name = name;
        prize.description = description;
        prize.image_url = image_url;
        prize.metadata_uri = metadata_uri;
        prize.physical_sku = physical_sku;
        prize.tier = tier;
        prize.probability_bp = probability_bp;
        prize.cost_usd = cost_usd;
        prize.weight_grams = weight_grams;
        prize.supply_total = supply_total;
        prize.supply_remaining = supply_total;
        prize.bump = ctx.bumps.prize;

        // Update game
        game.prize_probabilities[prize_index as usize] = probability_bp;
        game.prize_count = prize_index + 1;
        game.total_supply_remaining = game.total_supply_remaining.checked_add(supply_total).ok_or(ErrorCode::MathOverflow)?;
        
        // Activate game if it has prizes with supply
        if game.total_supply_remaining > 0 {
            game.is_active = true;
        }

        emit!(PrizeAdded {
            game_id: game.game_id,
            prize_index,
            prize_id,
            probability_bp,
            supply_total,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Play the game - transfers tokens from user to treasury
    pub fn play_game(ctx: Context<PlayGame>, token_amount: u64) -> Result<()> {
        let game = &ctx.accounts.game;
        
        require!(game.is_active, ErrorCode::GameInactive);
        require!(game.total_supply_remaining > 0, ErrorCode::OutOfStock);
        require!(token_amount > 0, ErrorCode::InvalidTokenAmount);
        
        // Validate token accounts
        require!(
            ctx.accounts.user_token_account.owner == ctx.accounts.user.key(),
            ErrorCode::Unauthorized
        );
        require!(
            ctx.accounts.user_token_account.mint == game.token_mint,
            ErrorCode::Unauthorized
        );
        require!(
            ctx.accounts.treasury_token_account.mint == game.token_mint,
            ErrorCode::Unauthorized
        );

        // Transfer tokens from user to treasury
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

    /// Finalize play - determines outcome and mints NFT if won
    /// The winning prize account (if any) must be passed as remaining_account[0]
    pub fn finalize_play(ctx: Context<FinalizePlay>, random_value: [u8; 32]) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require!(game.is_active, ErrorCode::GameInactive);

        let game_id = game.game_id;
        let user_key = ctx.accounts.user.key();
        
        // Select prize using stored probabilities
        let winning_index = select_prize_index(&game.prize_probabilities, game.prize_count, &random_value);
        
        // Update game state
        game.total_plays = game.total_plays.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        game.last_random_value = random_value;
        
        match winning_index {
            Some(prize_idx) => {
                // User won! Get the prize from remaining accounts
                require!(
                    ctx.remaining_accounts.len() >= 1,
                    ErrorCode::PrizeNotFound
                );
                
                let prize_account_info = &ctx.remaining_accounts[0];
                
                // Deserialize and validate the prize account
                let mut prize_data = prize_account_info.try_borrow_mut_data()?;
                let mut prize: Prize = Prize::try_deserialize(&mut &prize_data[..])?;
                
                // Validate prize belongs to this game and is the correct index
                require!(prize.game == game.key(), ErrorCode::Unauthorized);
                require!(prize.prize_index == prize_idx as u8, ErrorCode::PrizeNotFound);
                require!(prize.supply_remaining > 0, ErrorCode::OutOfStock);
                
                // Store prize info before updating
                let prize_id = prize.prize_id;
                let prize_tier = prize.tier.clone();
                let metadata_uri = prize.metadata_uri.clone();
                let prize_name = prize.name.clone();
                
                // Decrement prize supply
                prize.supply_remaining = prize.supply_remaining.checked_sub(1).ok_or(ErrorCode::MathOverflow)?;
                
                // Serialize prize back
                prize.try_serialize(&mut *prize_data)?;
                drop(prize_data);
                
                // Update game supply tracking
                game.total_supply_remaining = game.total_supply_remaining.saturating_sub(1);
                if game.total_supply_remaining == 0 {
                    game.is_active = false;
                }

                // Mint NFT
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
                    prize_index: prize_idx as u8,
                    tier: prize_tier,
                    nft_mint,
                    random_value,
                    timestamp: Clock::get()?.unix_timestamp,
                });
            }
            None => {
                // User lost (draw fell outside prize probability range)
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

    /// Update game status
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

    /// Replenish prize supply
    pub fn replenish_prize_supply(
        ctx: Context<ReplenishPrizeSupply>,
        additional_supply: u32,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let prize = &mut ctx.accounts.prize;
        
        // Validate prize belongs to game
        require!(prize.game == game.key(), ErrorCode::Unauthorized);
        
        prize.supply_total = prize.supply_total.checked_add(additional_supply).ok_or(ErrorCode::MathOverflow)?;
        prize.supply_remaining = prize.supply_remaining.checked_add(additional_supply).ok_or(ErrorCode::MathOverflow)?;
        
        game.total_supply_remaining = game.total_supply_remaining.checked_add(additional_supply).ok_or(ErrorCode::MathOverflow)?;
        
        if additional_supply > 0 && !game.is_active {
            game.is_active = true;
        }

        emit!(SupplyReplenished {
            game_id: game.game_id,
            prize_id: prize.prize_id,
            prize_index: prize.prize_index,
            new_supply: prize.supply_remaining,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Withdraw from treasury
    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        let game = &ctx.accounts.game;
        
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

    /// Close a game (returns rent)
    pub fn close_game(_ctx: Context<CloseGame>) -> Result<()> {
        Ok(())
    }
    
    /// Close a prize (returns rent)
    pub fn close_prize(_ctx: Context<ClosePrize>) -> Result<()> {
        Ok(())
    }
}

// ============================================
// Account Structures
// ============================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PrizeTier {
    Common,
    Uncommon,
    Rare,
    Legendary,
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub bump: u8,
}

/// Game account - now lightweight without embedded prizes
/// Size: 8 + 32 + 8 + (4+50) + (4+200) + (4+200) + 32 + 8 + 32 + 1 + (16*2) + 4 + 8 + 1 + 32 + 1 = ~650 bytes
#[account]
pub struct Game {
    pub authority: Pubkey,           // 32
    pub game_id: u64,                // 8
    pub name: String,                // 4 + 50 max
    pub description: String,         // 4 + 200 max
    pub image_url: String,           // 4 + 200 max
    pub token_mint: Pubkey,          // 32
    pub cost_usd: u64,               // 8
    pub treasury: Pubkey,            // 32
    pub prize_count: u8,             // 1 - Number of prizes
    pub prize_probabilities: [u16; MAX_PRIZES], // 32 - Probabilities for quick selection
    pub total_supply_remaining: u32, // 4 - Track total supply across all prizes
    pub total_plays: u64,            // 8
    pub is_active: bool,             // 1
    pub last_random_value: [u8; 32], // 32
    pub bump: u8,                    // 1
}

/// Prize account - separate PDA for each prize
/// Size: 8 + 32 + 1 + 8 + (4+50) + (4+150) + (4+200) + (4+200) + (4+50) + 1 + 2 + 8 + 4 + 4 + 4 + 1 = ~754 bytes
#[account]
pub struct Prize {
    pub game: Pubkey,                // 32 - Parent game
    pub prize_index: u8,             // 1 - Index in game's probability array
    pub prize_id: u64,               // 8 - Unique ID for this prize
    pub name: String,                // 4 + 50 max
    pub description: String,         // 4 + 150 max
    pub image_url: String,           // 4 + 200 max
    pub metadata_uri: String,        // 4 + 200 max
    pub physical_sku: String,        // 4 + 50 max
    pub tier: PrizeTier,             // 1
    pub probability_bp: u16,         // 2
    pub cost_usd: u64,               // 8
    pub weight_grams: u32,           // 4
    pub supply_total: u32,           // 4
    pub supply_remaining: u32,       // 4
    pub bump: u8,                    // 1
}

// ============================================
// Account Contexts
// ============================================

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
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + (4+50) + (4+200) + (4+200) + 32 + 8 + 32 + 1 + (MAX_PRIZES*2) + 4 + 8 + 1 + 32 + 1 + 100, // +100 padding
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    /// CHECK: Treasury wallet
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(prize_index: u8)]
pub struct AddPrize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority @ ErrorCode::Unauthorized)]
    pub game: Account<'info, Game>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1 + 8 + (4+50) + (4+150) + (4+200) + (4+200) + (4+50) + 1 + 2 + 8 + 4 + 4 + 4 + 1 + 50, // +50 padding
        seeds = [b"prize", game.key().as_ref(), &[prize_index]],
        bump
    )]
    pub prize: Account<'info, Prize>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlayGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FinalizePlay<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub user: Signer<'info>,
    
    // NFT Minting accounts
    /// CHECK: Mint account for the NFT
    #[account(mut)]
    pub nft_mint: UncheckedAccount<'info>,
    /// CHECK: Metadata PDA
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: Master Edition PDA
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    /// CHECK: User's NFT token account
    #[account(mut)]
    pub user_nft_token_account: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    /// CHECK: Metaplex Token Metadata program
    pub metaplex_token_metadata_program: UncheckedAccount<'info>,
    /// CHECK: Rent sysvar
    pub rent: UncheckedAccount<'info>,
    // NOTE: Winning prize account passed via remaining_accounts[0]
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
    #[account(mut)]
    pub prize: Account<'info, Prize>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(has_one = authority)]
    pub game: Account<'info, Game>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub treasury_authority: Signer<'info>,
    #[account(
        mut,
        constraint = treasury_token_account.mint == game.token_mint,
        constraint = treasury_token_account.owner == treasury_authority.key()
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = destination_token_account.mint == game.token_mint)]
    pub destination_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseGame<'info> {
    #[account(mut, has_one = authority @ ErrorCode::Unauthorized, close = authority)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClosePrize<'info> {
    #[account(has_one = authority @ ErrorCode::Unauthorized)]
    pub game: Account<'info, Game>,
    #[account(mut, constraint = prize.game == game.key(), close = authority)]
    pub prize: Account<'info, Prize>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

// ============================================
// Events
// ============================================

#[event]
pub struct GameCreated {
    pub game_id: u64,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PrizeAdded {
    pub game_id: u64,
    pub prize_index: u8,
    pub prize_id: u64,
    pub probability_bp: u16,
    pub supply_total: u32,
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
    pub prize_index: u8,
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
    pub prize_index: u8,
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

// ============================================
// Errors
// ============================================

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
    #[msg("Too many prizes (max 16)")]
    TooManyPrizes,
    #[msg("Invalid prize index")]
    InvalidPrizeIndex,
}

// ============================================
// Helper Functions
// ============================================

/// Select a prize index based on random value and probability distribution
fn select_prize_index(probabilities: &[u16; MAX_PRIZES], prize_count: u8, random_value: &[u8; 32]) -> Option<usize> {
    // Convert first 8 bytes to u64 and normalize to 0..9999
    let rand_u64 = u64::from_le_bytes(random_value[0..8].try_into().unwrap());
    let draw = (rand_u64 % 10_000) as u16;
    
    let mut cumulative: u16 = 0;
    for idx in 0..(prize_count as usize) {
        let prob = probabilities[idx];
        if prob == 0 { continue; }
        cumulative = cumulative.saturating_add(prob);
        if draw < cumulative {
            return Some(idx);
        }
    }
    None // Loss - draw fell outside prize probability range
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
    let nft_mint_key = accounts.nft_mint.key();
    
    // Verify Metaplex program
    require!(
        accounts.metaplex_token_metadata_program.key() == METAPLEX_TOKEN_METADATA_PROGRAM_ID,
        ErrorCode::Unauthorized
    );
    
    // Derive and verify metadata PDA
    let nft_mint_bytes = nft_mint_key.as_ref();
    let metadata_seeds = &[
        b"metadata",
        METAPLEX_TOKEN_METADATA_PROGRAM_ID.as_ref(),
        nft_mint_bytes,
    ];
    let (metadata_pda, _) = Pubkey::find_program_address(metadata_seeds, &METAPLEX_TOKEN_METADATA_PROGRAM_ID);
    require!(accounts.metadata.key() == metadata_pda, ErrorCode::Unauthorized);
    
    // Derive and verify master edition PDA
    let master_edition_seeds = &[
        b"metadata",
        METAPLEX_TOKEN_METADATA_PROGRAM_ID.as_ref(),
        nft_mint_bytes,
        b"edition",
    ];
    let (master_edition_pda, _) = Pubkey::find_program_address(master_edition_seeds, &METAPLEX_TOKEN_METADATA_PROGRAM_ID);
    require!(accounts.master_edition.key() == master_edition_pda, ErrorCode::Unauthorized);
    
    // Verify user's token account
    let expected_ata = get_associated_token_address(&accounts.user.key(), &nft_mint_key);
    require!(accounts.user_nft_token_account.key() == expected_ata, ErrorCode::Unauthorized);
    
    // Derive game PDA bump for signing
    let (game_pda, game_bump) = Pubkey::find_program_address(
        &[b"game", &game_id.to_le_bytes()],
        ctx.program_id,
    );
    require!(accounts.game.key() == game_pda, ErrorCode::Unauthorized);
    
    // Game PDA seeds for signing
    let game_id_bytes = game_id.to_le_bytes();
    let game_bump_array = [game_bump];
    let game_seeds: &[&[u8]] = &[b"game", &game_id_bytes, &game_bump_array];
    
    // Build metadata
    let data_v2 = DataV2 {
        name: name.to_string(),
        symbol: "PRIZE".to_string(),
        uri: uri.to_string(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };
    
    // Get account infos
    let metaplex_program_info = accounts.metaplex_token_metadata_program.to_account_info();
    let metadata_info = accounts.metadata.to_account_info();
    let mint_info = accounts.nft_mint.to_account_info();
    let game_info = accounts.game.to_account_info();
    let user_info = accounts.user.to_account_info();
    let system_program_info = accounts.system_program.to_account_info();
    let rent_info = accounts.rent.to_account_info();
    
    // Create metadata account
    CreateMetadataAccountV3Cpi::new(
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
    ).invoke_signed(&[game_seeds])?;
    
    // Mint 1 token to user
    let user_nft_token_account_info = accounts.user_nft_token_account.to_account_info();
    let cpi_accounts = MintTo {
        mint: accounts.nft_mint.to_account_info(),
        to: user_nft_token_account_info,
        authority: accounts.game.to_account_info(),
    };
    let signer_seeds: &[&[&[u8]]] = &[game_seeds];
    token::mint_to(
        CpiContext::new_with_signer(accounts.token_program.to_account_info(), cpi_accounts, signer_seeds),
        1,
    )?;
    
    // Create master edition
    let master_edition_info = accounts.master_edition.to_account_info();
    let token_program_info = accounts.token_program.to_account_info();
    
    CreateMasterEditionV3Cpi::new(
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
        CreateMasterEditionV3InstructionArgs { max_supply: None },
    ).invoke_signed(&[game_seeds])?;
    
    Ok(nft_mint_key)
}
