use anchor_lang::prelude::*;
use anchor_lang::prelude::InterfaceAccount;
use anchor_lang::prelude::Interface;
use anchor_spl::token::{self, MintTo, Token};
use anchor_spl::token_interface::{self, TokenAccount, TokenInterface, TransferChecked};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("EKzLHZyU6WVfhYVXcE6R4hRE4YuWrva8NeLGMYB7ZDU6");

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
        length_hundredths: u16,  // Length in hundredths of an inch (650 = 6.50")
        width_hundredths: u16,   // Width in hundredths of an inch
        height_hundredths: u16,  // Height in hundredths of an inch
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
        
        // Check total probability doesn't exceed 10000 (using checked arithmetic)
        let current_total: u32 = game.prize_probabilities.iter().map(|&p| p as u32).sum();
        let new_total = current_total.checked_add(probability_bp as u32).ok_or(ErrorCode::MathOverflow)?;
        require!(new_total <= 10_000, ErrorCode::InvalidProbabilities);

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
        prize.length_hundredths = length_hundredths;
        prize.width_hundredths = width_hundredths;
        prize.height_hundredths = height_hundredths;
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

    /// Play the game - transfers tokens to treasury and creates a play session
    /// The backend will finalize the play by calling finalize_play with randomness
    /// session_seed: A unique 32-byte seed to derive the session PDA (client generates this)
    pub fn play_game(ctx: Context<PlayGame>, token_amount: u64, session_seed: [u8; 32]) -> Result<()> {
        let game = &ctx.accounts.game;
        let clock = Clock::get()?;
        
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

        // Get token decimals from mint account
        let mint_info = ctx.accounts.token_mint.to_account_info();
        let mint_data = mint_info.try_borrow_data()?;
        let decimals = mint_data[44]; // Decimals is at offset 44 in mint account data

        // Transfer tokens from user to treasury using token interface (supports both Token and Token-2022)
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, token_amount, decimals)?;

        // Initialize play session - awaiting backend finalization
        let session = &mut ctx.accounts.play_session;
        session.user = ctx.accounts.user.key();
        session.game = game.key();
        session.amount_paid = token_amount;
        session.session_seed = session_seed;
        session.is_fulfilled = false;
        session.random_value = [0u8; 32];
        session.prize_index = None;
        session.is_claimed = false;
        session.bump = ctx.bumps.play_session;

        emit!(GamePlayInitiated {
            user: ctx.accounts.user.key(),
            game_id: game.game_id,
            token_amount,
            session: session.key(),
            timestamp: clock.unix_timestamp,
        });
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
        
        // Get token decimals from mint account
        let mint_info = ctx.accounts.token_mint.to_account_info();
        let mint_data = mint_info.try_borrow_data()?;
        let decimals = mint_data[44]; // Decimals is at offset 44 in mint account data
        
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.destination_token_account.to_account_info(),
            authority: ctx.accounts.treasury.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, amount, decimals)?;

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

    /// Finalize play - called by backend with random value
    /// Backend authority must co-sign to prevent users from choosing their own random value
    /// Finalize play with optional auto-mint on win
    /// 
    /// When user wins, additional accounts are expected in remaining_accounts:
    /// [0] - Prize account (required for wins)
    /// [1] - NFT mint account (signer, new keypair)
    /// [2] - Metadata PDA
    /// [3] - Master Edition PDA
    /// [4] - User's NFT token account (ATA)
    /// [5] - User account info (for ATA owner)
    /// [6] - Token Program
    /// [7] - Associated Token Program
    /// [8] - Metaplex Token Metadata Program
    /// [9] - System Program
    /// [10] - Rent sysvar
    pub fn finalize_play<'info>(ctx: Context<'_, '_, 'info, 'info, FinalizePlay<'info>>, random_value: [u8; 32]) -> Result<()> {
        use anchor_spl::associated_token::get_associated_token_address;
        use mpl_token_metadata::{
            instructions::{
                CreateMetadataAccountV3Cpi, CreateMasterEditionV3Cpi,
                CreateMetadataAccountV3CpiAccounts, CreateMasterEditionV3CpiAccounts,
                CreateMetadataAccountV3InstructionArgs, CreateMasterEditionV3InstructionArgs,
            },
            types::DataV2,
        };
        
        // Read all needed values first (before any mutable borrows)
        let session_is_fulfilled = ctx.accounts.play_session.is_fulfilled;
        let user_key = ctx.accounts.play_session.user;
        let session_key = ctx.accounts.play_session.key();
        let game_key = ctx.accounts.game.key();
        let game_id = ctx.accounts.game.game_id;
        let prize_probabilities = ctx.accounts.game.prize_probabilities;
        let prize_count = ctx.accounts.game.prize_count;
        let total_supply = ctx.accounts.game.total_supply_remaining;
        let program_id = ctx.program_id;
        
        // Ensure session hasn't already been fulfilled
        require!(!session_is_fulfilled, ErrorCode::AlreadyFulfilled);
        
        // Determine winner using stored probabilities
        let winning_index = select_prize_index(
            &prize_probabilities,
            prize_count,
            &random_value
        );
        
        // If won, process the prize and mint NFT
        let (nft_mint_result, prize_id, prize_tier) = if let Some(prize_idx) = winning_index {
            // For wins, we expect 11 accounts in remaining_accounts
            require!(
                ctx.remaining_accounts.len() >= 11,
                ErrorCode::PrizeNotFound
            );
            
            let prize_account_info = &ctx.remaining_accounts[0];
            let mut prize_data = prize_account_info.try_borrow_mut_data()?;
            let mut prize: Prize = Prize::try_deserialize(&mut &prize_data[..])?;
            
            // Validate prize
            require!(prize.game == game_key, ErrorCode::Unauthorized);
            require!(prize.prize_index == prize_idx as u8, ErrorCode::PrizeNotFound);
            require!(prize.supply_remaining > 0, ErrorCode::OutOfStock);
            
            let p_id = prize.prize_id;
            let p_tier = prize.tier.clone();
            let prize_name = prize.name.clone();
            let prize_metadata_uri = prize.metadata_uri.clone();
            
            // Decrement supply
            prize.supply_remaining = prize.supply_remaining.checked_sub(1).ok_or(ErrorCode::MathOverflow)?;
            prize.try_serialize(&mut *prize_data)?;
            drop(prize_data);
            
            // ========== INLINE NFT MINTING ==========
            // Get NFT minting accounts from remaining_accounts
            let nft_mint = &ctx.remaining_accounts[1];
            let metadata = &ctx.remaining_accounts[2];
            let master_edition = &ctx.remaining_accounts[3];
            let user_nft_token_account = &ctx.remaining_accounts[4];
            let user_account = &ctx.remaining_accounts[5];
            let token_program = &ctx.remaining_accounts[6];
            let associated_token_program = &ctx.remaining_accounts[7];
            let metaplex_program = &ctx.remaining_accounts[8];
            let system_program = &ctx.remaining_accounts[9];
            let rent = &ctx.remaining_accounts[10];
            
            let nft_mint_key = nft_mint.key();
            let payer = &ctx.accounts.backend_authority;
            let game_account = &ctx.accounts.game;
            
            // Verify Metaplex program
            require!(
                metaplex_program.key() == METAPLEX_TOKEN_METADATA_PROGRAM_ID,
                ErrorCode::Unauthorized
            );
            
            // Verify user account matches session user
            require!(user_account.key() == user_key, ErrorCode::Unauthorized);
            
            // Derive and verify metadata PDA
            let nft_mint_bytes = nft_mint_key.as_ref();
            let metadata_seeds = &[
                b"metadata",
                METAPLEX_TOKEN_METADATA_PROGRAM_ID.as_ref(),
                nft_mint_bytes,
            ];
            let (metadata_pda, _) = Pubkey::find_program_address(metadata_seeds, &METAPLEX_TOKEN_METADATA_PROGRAM_ID);
            require!(metadata.key() == metadata_pda, ErrorCode::Unauthorized);
            
            // Derive and verify master edition PDA
            let master_edition_seeds = &[
                b"metadata",
                METAPLEX_TOKEN_METADATA_PROGRAM_ID.as_ref(),
                nft_mint_bytes,
                b"edition",
            ];
            let (master_edition_pda, _) = Pubkey::find_program_address(master_edition_seeds, &METAPLEX_TOKEN_METADATA_PROGRAM_ID);
            require!(master_edition.key() == master_edition_pda, ErrorCode::Unauthorized);
            
            // Verify user's token account
            let expected_ata = get_associated_token_address(&user_key, &nft_mint_key);
            require!(user_nft_token_account.key() == expected_ata, ErrorCode::Unauthorized);
            
            // Derive game PDA bump for signing
            let (game_pda, game_bump) = Pubkey::find_program_address(
                &[b"game", &game_id.to_le_bytes()],
                program_id,
            );
            require!(game_key == game_pda, ErrorCode::Unauthorized);
            
            // Game PDA seeds for signing
            let game_id_bytes = game_id.to_le_bytes();
            let game_bump_array = [game_bump];
            let game_seeds: &[&[u8]] = &[b"game", &game_id_bytes, &game_bump_array];
            
            // 1. Create mint account
            let mint_rent = Rent::get()?.minimum_balance(82);
            anchor_lang::system_program::create_account(
                CpiContext::new(
                    system_program.to_account_info(),
                    anchor_lang::system_program::CreateAccount {
                        from: payer.to_account_info(),
                        to: nft_mint.to_account_info(),
                    },
                ),
                mint_rent,
                82,
                &anchor_spl::token::ID,
            )?;
            
            // 2. Initialize mint with game as authority
            let init_mint_ix = anchor_spl::token::spl_token::instruction::initialize_mint(
                &anchor_spl::token::ID,
                &nft_mint_key,
                &game_pda,
                Some(&game_pda),
                0,
            )?;
            anchor_lang::solana_program::program::invoke(
                &init_mint_ix,
                &[
                    nft_mint.to_account_info(),
                    rent.to_account_info(),
                ],
            )?;
            
            // 3. Create associated token account for user
            anchor_spl::associated_token::create(
                CpiContext::new(
                    associated_token_program.to_account_info(),
                    anchor_spl::associated_token::Create {
                        payer: payer.to_account_info(),
                        associated_token: user_nft_token_account.to_account_info(),
                        authority: user_account.to_account_info(),
                        mint: nft_mint.to_account_info(),
                        system_program: system_program.to_account_info(),
                        token_program: token_program.to_account_info(),
                    },
                ),
            )?;
            
            // Build metadata
            let data_v2 = DataV2 {
                name: prize_name.clone(),
                symbol: "PRIZE".to_string(),
                uri: prize_metadata_uri.clone(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            };
            
            // Get account infos
            let game_info = game_account.to_account_info();
            let payer_info = payer.to_account_info();
            
            // 4. Create metadata account
            CreateMetadataAccountV3Cpi::new(
                &metaplex_program.to_account_info(),
                CreateMetadataAccountV3CpiAccounts {
                    metadata: &metadata.to_account_info(),
                    mint: &nft_mint.to_account_info(),
                    mint_authority: &game_info,
                    payer: &payer_info,
                    update_authority: (&game_info, true),
                    system_program: &system_program.to_account_info(),
                    rent: Some(&rent.to_account_info()),
                },
                CreateMetadataAccountV3InstructionArgs {
                    data: data_v2,
                    is_mutable: false,
                    collection_details: None,
                },
            ).invoke_signed(&[game_seeds])?;
            
            // 5. Mint 1 token to user
            let cpi_accounts = MintTo {
                mint: nft_mint.to_account_info(),
                to: user_nft_token_account.to_account_info(),
                authority: game_info.clone(),
            };
            let signer_seeds: &[&[&[u8]]] = &[game_seeds];
            token::mint_to(
                CpiContext::new_with_signer(token_program.to_account_info(), cpi_accounts, signer_seeds),
                1,
            )?;
            
            // 6. Create master edition
            CreateMasterEditionV3Cpi::new(
                &metaplex_program.to_account_info(),
                CreateMasterEditionV3CpiAccounts {
                    edition: &master_edition.to_account_info(),
                    mint: &nft_mint.to_account_info(),
                    update_authority: &game_info,
                    mint_authority: &game_info,
                    payer: &payer_info,
                    metadata: &metadata.to_account_info(),
                    token_program: &token_program.to_account_info(),
                    system_program: &system_program.to_account_info(),
                    rent: Some(&rent.to_account_info()),
                },
                CreateMasterEditionV3InstructionArgs { max_supply: None },
            ).invoke_signed(&[game_seeds])?;
            
            (Some(nft_mint_key), Some(p_id), Some(p_tier))
        } else {
            (None, None, None)
        };
        
        // Now do mutable borrows for session and game updates
        let session = &mut ctx.accounts.play_session;
        let game = &mut ctx.accounts.game;
        
        // Update session
        session.is_fulfilled = true;
        session.random_value = random_value;
        session.prize_index = winning_index.map(|i| i as u8);
        
        // Update game stats
        game.total_plays = game.total_plays.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        game.last_random_value = random_value;
        
        // If won, update game supply and mark session claimed
        if let Some(prize_idx) = winning_index {
            game.total_supply_remaining = total_supply.saturating_sub(1);
            if game.total_supply_remaining == 0 {
                game.is_active = false;
            }
            session.is_claimed = true;
            
            let nft_mint = nft_mint_result.unwrap();
            let tier = prize_tier.clone().unwrap();
            
            emit!(PlayResolved {
                user: user_key,
                game_id,
                session: session_key,
                prize_id,
                prize_index: Some(prize_idx as u8),
                tier: prize_tier,
                is_win: true,
                random_value,
                timestamp: Clock::get()?.unix_timestamp,
            });
            
            emit!(PrizeClaimed {
                user: user_key,
                game_id,
                session: session_key,
                prize_id: prize_id.unwrap(),
                prize_index: prize_idx as u8,
                tier,
                nft_mint,
                timestamp: Clock::get()?.unix_timestamp,
            });
        } else {
            emit!(PlayResolved {
                user: user_key,
                game_id,
                session: session_key,
                prize_id: None,
                prize_index: None,
                tier: None,
                is_win: false,
                random_value,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }
        
        Ok(())
    }

    /// Claim prize - mints NFT after randomness fulfilled and user won
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        // Read session data first (immutable borrow)
        let session_key = ctx.accounts.play_session.key();
        let is_fulfilled = ctx.accounts.play_session.is_fulfilled;
        let prize_idx_opt = ctx.accounts.play_session.prize_index;
        let is_claimed = ctx.accounts.play_session.is_claimed;
        let session_user = ctx.accounts.play_session.user;
        let session_game = ctx.accounts.play_session.game;
        
        let game = &ctx.accounts.game;
        let prize = &ctx.accounts.prize;
        let user_key = ctx.accounts.user.key();
        
        // Validate session state
        require!(is_fulfilled, ErrorCode::NotFulfilled);
        require!(prize_idx_opt.is_some(), ErrorCode::NoPrize);
        require!(!is_claimed, ErrorCode::AlreadyClaimed);
        require!(session_user == user_key, ErrorCode::Unauthorized);
        require!(session_game == game.key(), ErrorCode::Unauthorized);
        
        let prize_idx = prize_idx_opt.unwrap();
        
        // Validate prize
        require!(prize.game == game.key(), ErrorCode::Unauthorized);
        require!(prize.prize_index == prize_idx, ErrorCode::PrizeNotFound);
        
        // Store values needed for event
        let game_id = game.game_id;
        let prize_id = prize.prize_id;
        let prize_tier = prize.tier.clone();
        let prize_name = prize.name.clone();
        let prize_metadata_uri = prize.metadata_uri.clone();
        
        // Mint NFT to user
        let nft_mint = mint_prize_nft_for_claim(
            &ctx,
            &prize_name,
            &prize_metadata_uri,
            &prize_tier,
            game_id,
            prize_id,
        )?;
        
        // Now mark as claimed (mutable borrow)
        ctx.accounts.play_session.is_claimed = true;
        
        emit!(PrizeClaimed {
            user: user_key,
            game_id,
            session: session_key,
            prize_id,
            prize_index: prize_idx,
            tier: prize_tier,
            nft_mint,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    /// Close a play session (returns rent after claiming or if lost)
    pub fn close_play_session(ctx: Context<ClosePlaySession>) -> Result<()> {
        let session = &ctx.accounts.play_session;
        
        // Can only close if fulfilled and either claimed or lost
        require!(session.is_fulfilled, ErrorCode::NotFulfilled);
        if session.prize_index.is_some() {
            require!(session.is_claimed, ErrorCode::NotClaimed);
        }
        
        // Account will be closed by close = user attribute
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
/// Size: 8 + 32 + 1 + 8 + (4+50) + (4+150) + (4+200) + (4+200) + (4+50) + 1 + 2 + 8 + 4 + 2 + 2 + 2 + 4 + 4 + 1 = ~760 bytes
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
    pub length_hundredths: u16,      // 2 - Length in hundredths of an inch (650 = 6.50")
    pub width_hundredths: u16,       // 2 - Width in hundredths of an inch
    pub height_hundredths: u16,      // 2 - Height in hundredths of an inch
    pub supply_total: u32,           // 4
    pub supply_remaining: u32,       // 4
    pub bump: u8,                    // 1
}

/// PlaySession account - tracks a pending play awaiting backend finalization
/// Size: 8 + 32 + 32 + 8 + 32 + 1 + 32 + 2 + 1 + 1 = 151 bytes
#[account]
pub struct PlaySession {
    pub user: Pubkey,                // 32 - User who paid
    pub game: Pubkey,                // 32 - Game being played
    pub amount_paid: u64,            // 8  - Token amount paid
    pub session_seed: [u8; 32],      // 32 - Unique seed for PDA derivation
    pub is_fulfilled: bool,          // 1  - Has randomness been provided by backend
    pub random_value: [u8; 32],      // 32 - Random bytes (after fulfillment)
    pub prize_index: Option<u8>,     // 1 + 1 = 2 - Winning prize index (None = lost)
    pub is_claimed: bool,            // 1  - Has prize been claimed (NFT minted)
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
        space = 8 + 32 + 1 + 8 + (4+50) + (4+150) + (4+200) + (4+200) + (4+50) + 1 + 2 + 8 + 4 + 2 + 2 + 2 + 4 + 4 + 1 + 50, // +50 padding, includes dimension fields
        seeds = [b"prize", game.key().as_ref(), &[prize_index]],
        bump
    )]
    pub prize: Account<'info, Prize>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(token_amount: u64, session_seed: [u8; 32])]
pub struct PlayGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Token mint account - validated in instruction
    pub token_mint: AccountInfo<'info>,
    
    // PlaySession PDA - unique per game + user + session_seed
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 8 + 32 + 1 + 32 + 2 + 1 + 1 + 50, // +50 padding
        seeds = [b"session", game.key().as_ref(), user.key().as_ref(), &session_seed],
        bump
    )]
    pub play_session: Account<'info, PlaySession>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
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
    #[account(has_one = authority, has_one = treasury @ ErrorCode::Unauthorized)]
    pub game: Account<'info, Game>,
    pub authority: Signer<'info>,
    /// CHECK: Treasury wallet - must match game.treasury and sign the transaction
    #[account(
        mut,
        constraint = treasury.key() == game.treasury @ ErrorCode::Unauthorized
    )]
    pub treasury: Signer<'info>,
    #[account(
        mut,
        constraint = treasury_token_account.mint == game.token_mint @ ErrorCode::Unauthorized,
        constraint = treasury_token_account.owner == treasury.key() @ ErrorCode::Unauthorized
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, constraint = destination_token_account.mint == game.token_mint @ ErrorCode::Unauthorized)]
    pub destination_token_account: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Token mint account - needed for transfer_checked
    pub token_mint: AccountInfo<'info>,
    pub token_program: Interface<'info, TokenInterface>,
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

#[derive(Accounts)]
pub struct FinalizePlay<'info> {
    #[account(
        mut,
        constraint = play_session.game == game.key() @ ErrorCode::Unauthorized
    )]
    pub play_session: Account<'info, PlaySession>,
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// Backend authority must co-sign - pays for NFT minting on wins
    #[account(
        mut,
        constraint = backend_authority.key() == config.authority @ ErrorCode::Unauthorized
    )]
    pub backend_authority: Signer<'info>,
    // NOTE: For wins, additional accounts passed via remaining_accounts:
    // [0] Prize, [1] NFT mint (signer), [2] Metadata PDA, [3] Master Edition PDA,
    // [4] User's ATA, [5] User account, [6] Token Program, [7] Associated Token Program,
    // [8] Metaplex Program, [9] System Program, [10] Rent
}

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(
        mut,
        constraint = play_session.game == game.key() @ ErrorCode::Unauthorized,
        constraint = play_session.user == user.key() @ ErrorCode::Unauthorized
    )]
    pub play_session: Account<'info, PlaySession>,
    pub game: Account<'info, Game>,
    #[account(
        constraint = prize.game == game.key() @ ErrorCode::Unauthorized
    )]
    pub prize: Account<'info, Prize>,
    #[account(mut)]
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
}

#[derive(Accounts)]
pub struct ClosePlaySession<'info> {
    #[account(
        mut,
        constraint = play_session.user == user.key() @ ErrorCode::Unauthorized,
        close = user
    )]
    pub play_session: Account<'info, PlaySession>,
    #[account(mut)]
    pub user: Signer<'info>,
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
    pub session: Pubkey,
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

#[event]
pub struct PlayResolved {
    pub user: Pubkey,
    pub game_id: u64,
    pub session: Pubkey,
    pub prize_id: Option<u64>,
    pub prize_index: Option<u8>,
    pub tier: Option<PrizeTier>,
    pub is_win: bool,
    pub random_value: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct PrizeClaimed {
    pub user: Pubkey,
    pub game_id: u64,
    pub session: Pubkey,
    pub prize_id: u64,
    pub prize_index: u8,
    pub tier: PrizeTier,
    pub nft_mint: Pubkey,
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
    #[msg("Play session already fulfilled")]
    AlreadyFulfilled,
    #[msg("Play session not fulfilled yet")]
    NotFulfilled,
    #[msg("No prize won in this session")]
    NoPrize,
    #[msg("Prize already claimed")]
    AlreadyClaimed,
    #[msg("Must claim prize before closing session")]
    NotClaimed,
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

fn mint_prize_nft_for_claim(
    ctx: &Context<ClaimPrize>,
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
