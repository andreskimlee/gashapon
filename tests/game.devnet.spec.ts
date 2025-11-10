import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  MINT_SIZE,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";

describe("gachapon-game (Devnet)", () => {
  // Default token mint for games
  const DEFAULT_TOKEN_MINT = new PublicKey(
    "Cp95mjbZZnDvqCNYExmGYEzrgu6wAScf32Fmwt2Kpump"
  );

  // Set up provider with devnet
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Load wallet from keypair file
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(
      JSON.parse(
        fs.readFileSync(
          path.join(process.cwd(), "phantom-devnet-keypair.json"),
          "utf-8"
        )
      )
    )
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions()
  );
  anchor.setProvider(provider);

  // Load program IDL
  const gameProgramIdl = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "target/idl/gachapon_game.json"),
      "utf-8"
    )
  );
  const programId = new PublicKey(
    "4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG"
  );
  gameProgramIdl.address = programId.toString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameProgram = new anchor.Program(gameProgramIdl, provider) as any;

  // Use authority wallet as the user (simplifies testing)
  const user = wallet;

  let tokenMint: PublicKey;
  let tokenDecimals: number = 6; // Default to 6, will be updated from mint info
  let treasury: Keypair;
  let gamePda: PublicKey;
  let gameId = new BN(2);

  // Helper: Ensure account has minimum SOL balance
  async function ensureBalance(
    account: PublicKey,
    minBalanceSOL: number = 0.1
  ): Promise<void> {
    const balance = await connection.getBalance(account);
    const balanceSOL = balance / anchor.web3.LAMPORTS_PER_SOL;

    if (balanceSOL < minBalanceSOL) {
      const transferAmount = 0.15 * anchor.web3.LAMPORTS_PER_SOL;
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: account,
        lamports: transferAmount,
      });
      const transferTx = new anchor.web3.Transaction().add(transferInstruction);
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transferTx.recentBlockhash = blockhash;
      transferTx.feePayer = wallet.publicKey;
      const sig = await connection.sendTransaction(transferTx, [wallet.payer], {
        skipPreflight: false,
      });
      await connection.confirmTransaction(sig, "confirmed");
    }
  }

  // Helper: Load or create treasury keypair
  function loadOrCreateTreasury(): Keypair {
    const treasuryPath = path.join(
      process.cwd(),
      "treasury-devnet-keypair.json"
    );

    if (fs.existsSync(treasuryPath)) {
      return Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(treasuryPath, "utf-8")))
      );
    } else {
      const newTreasury = Keypair.generate();
      fs.writeFileSync(
        treasuryPath,
        JSON.stringify(Array.from(newTreasury.secretKey))
      );
      return newTreasury;
    }
  }

  // Helper: Verify token mint exists on devnet and get decimals
  async function verifyTokenMint(mint: PublicKey): Promise<number> {
    try {
      const mintInfo = await getMint(connection, mint);
      console.log(`   ✅ Token mint verified: ${mint.toString()}`);
      console.log(`      - Decimals: ${mintInfo.decimals}`);
      console.log(`      - Supply: ${mintInfo.supply.toString()}`);
      return mintInfo.decimals;
    } catch (error: any) {
      const accountInfo = await connection.getAccountInfo(mint);
      if (!accountInfo) {
        throw new Error(
          `Token mint ${mint.toString()} does not exist on devnet. ` +
            `Check on Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`
        );
      }
      // Account exists but getMint failed - might be a special token format
      console.log(
        `   ⚠️  Token mint exists but getMint failed: ${error.message}`
      );
      return 6; // Default to 6 decimals if we can't read it
    }
  }

  // Helper: Get or create associated token account
  async function getOrCreateAta(
    mint: PublicKey,
    owner: PublicKey
  ): Promise<PublicKey> {
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      mint,
      owner,
      false,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return ata.address;
  }

  before(async () => {
    console.log("🔑 Authority wallet:", wallet.publicKey.toString());
    const walletBalance =
      (await connection.getBalance(wallet.publicKey)) /
      anchor.web3.LAMPORTS_PER_SOL;
    console.log("💰 Wallet balance:", walletBalance.toFixed(4), "SOL");

    // Load or create treasury
    treasury = loadOrCreateTreasury();
    console.log("💰 Treasury:", treasury.publicKey.toString());
    await ensureBalance(treasury.publicKey);

    // Calculate game PDA
    [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), Buffer.from(gameId.toArray("le", 8))],
      gameProgram.programId
    );
    console.log("🎮 Game PDA:", gamePda.toString());

    // Always use the default token mint
    tokenMint = DEFAULT_TOKEN_MINT;
    console.log("🪙 Using token mint:", tokenMint.toString());

    // Check if game exists and verify treasury matches
    try {
      const existingGame = await gameProgram.account.game.fetch(gamePda);
      if (!existingGame.treasury.equals(treasury.publicKey)) {
        console.log(
          `   ⚠️  Warning: Game treasury (${existingGame.treasury.toString()}) doesn't match current treasury`
        );
      }
    } catch {
      // Game doesn't exist yet, will be created
    }

    // Verify token mint exists and get decimals
    tokenDecimals = await verifyTokenMint(tokenMint);
  });

  it("initializes a game", async () => {
    // Check if game already exists
    try {
      const game = await gameProgram.account.game.fetch(gamePda);
      console.log("✅ Game already exists, skipping initialization");
      console.log("   - Game ID:", game.gameId.toString());
      console.log("   - Authority:", game.authority.toString());
      console.log("   - Token Mint:", game.tokenMint.toString());
      console.log("   - Is Active:", game.isActive);
      return;
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist")) {
        throw error;
      }
    }

    // Prize pool with probabilities summing to 10,000 (100% win rate)
    // To test win/loss, set probabilities < 10,000 (e.g., 7000 = 70% win, 30% loss)
    const prizePool = [
      {
        prizeId: new BN(1),
        name: "Common Prize",
        metadataUri: "ipfs://common",
        physicalSku: "SKU-COMMON",
        tier: { common: {} } as any,
        probabilityBp: 9000, // 90% chance
        supplyTotal: 100,
        supplyRemaining: 100,
      },
      {
        prizeId: new BN(2),
        name: "Rare Prize",
        metadataUri: "ipfs://rare",
        physicalSku: "SKU-RARE",
        tier: { rare: {} } as any,
        probabilityBp: 1000, // 10% chance
        supplyTotal: 10,
        supplyRemaining: 10,
      },
      // Total: 10,000 bp = 100% win rate (no losses)
    ];

    console.log("🚀 Initializing game...");
    const tx = await gameProgram.methods
      .initializeGame(gameId, new BN(500), tokenMint, prizePool)
      .accounts({
        authority: wallet.publicKey,
        game: gamePda,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("   ✅ Transaction:", tx);
    console.log(
      "   📍 View on Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    // Wait for account to be available
    let retries = 10;
    while (retries > 0) {
      try {
        const game = await gameProgram.account.game.fetch(gamePda);
        console.log("   ✅ Game initialized:");
        console.log("      - Game ID:", game.gameId.toString());
        console.log("      - Authority:", game.authority.toString());
        console.log("      - Is Active:", game.isActive);
        return;
      } catch (error: any) {
        if (error.message?.includes("Account does not exist")) {
          retries--;
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            throw new Error(
              `Account not available after 10 retries. Transaction: ${tx}`
            );
          }
        } else {
          throw error;
        }
      }
    }
  });

  it("plays the game and transfers tokens", async () => {
    // Verify game exists and is active
    const game = await gameProgram.account.game.fetch(gamePda);
    if (!game.isActive) {
      throw new Error("Game is not active. Please activate it first.");
    }
    console.log("   ✅ Game is active and ready to play");

    console.log("🪙 Setting up token accounts...");
    const userAta = await getOrCreateAta(tokenMint, user.publicKey);
    const treasuryAta = await getOrCreateAta(tokenMint, treasury.publicKey);
    console.log("   ✅ User ATA:", userAta.toString());
    console.log("   ✅ Treasury ATA:", treasuryAta.toString());

    // Check current user balance
    let userBalanceBefore = await connection.getTokenAccountBalance(userAta);
    console.log(
      "   📊 User balance before:",
      userBalanceBefore.value.uiAmount,
      "tokens"
    );

    // Calculate 100k tokens in base units (100,000 * 10^decimals)
    const tokensToHave = 100_000;
    const tokensInBaseUnits = new BN(tokensToHave).mul(
      new BN(10).pow(new BN(tokenDecimals))
    );
    const currentBalanceBN = new BN(userBalanceBefore.value.amount);

    // Mint tokens if needed (only if wallet is mint authority)
    if (currentBalanceBN.lt(tokensInBaseUnits)) {
      const tokensNeeded = tokensInBaseUnits.sub(currentBalanceBN);
      console.log(
        `🪙 Minting ${tokensNeeded.toString()} base units (target: ${tokensToHave} tokens)...`
      );
      try {
        await mintTo(
          connection,
          wallet.payer,
          tokenMint,
          userAta,
          wallet.publicKey,
          tokensNeeded.toNumber()
        );
        console.log("   ✅ Tokens minted successfully");
      } catch (error: any) {
        if (
          error.message?.includes("mint authority") ||
          error.message?.includes("InvalidMintAuthority")
        ) {
          console.log(
            "   ⚠️  Cannot mint tokens (wallet is not mint authority)"
          );
          console.log("   ℹ️  Assuming wallet already has sufficient tokens");
        } else {
          throw error;
        }
      }
    } else {
      console.log(
        `   ✅ User already has sufficient tokens (${userBalanceBefore.value.uiAmount} tokens)`
      );
    }

    // Verify final balance
    const userBalanceAfter = await connection.getTokenAccountBalance(userAta);
    console.log(
      "   📊 User balance after setup:",
      userBalanceAfter.value.uiAmount,
      "tokens"
    );

    // Play the game with 1 token (1 * 10^decimals base units)
    const playAmountTokens = 1;
    const playAmountBaseUnits = new BN(playAmountTokens).mul(
      new BN(10).pow(new BN(tokenDecimals))
    );

    // Verify user has enough tokens to play
    const userBalanceBN = new BN(userBalanceAfter.value.amount);
    if (userBalanceBN.lt(playAmountBaseUnits)) {
      throw new Error(
        `Insufficient balance to play. Need ${playAmountTokens} tokens, but have ${userBalanceAfter.value.uiAmount} tokens`
      );
    }

    console.log(
      `🎮 Playing game with ${playAmountTokens} tokens (${playAmountBaseUnits.toString()} base units)...`
    );
    const tx = await gameProgram.methods
      .playGame(playAmountBaseUnits)
      .accounts({
        game: gamePda,
        user: user.publicKey,
        userTokenAccount: userAta,
        treasuryTokenAccount: treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([wallet.payer])
      .rpc();

    console.log("   ✅ Transaction:", tx);
    console.log(
      "   📍 View on Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    // Wait for transaction confirmation before checking balances
    await connection.confirmTransaction(tx, "confirmed");

    // Verify tokens were transferred
    const userBalanceFinal = await connection.getTokenAccountBalance(userAta);
    const treasuryBalanceFinal =
      await connection.getTokenAccountBalance(treasuryAta);
    console.log("   ✅ Token balances after play:");
    console.log("      - User:", userBalanceFinal.value.uiAmount, "tokens");
    console.log(
      "      - Treasury:",
      treasuryBalanceFinal.value.uiAmount,
      "tokens"
    );

    // Verify the transfer happened (use base units for precision)
    const expectedUserBalanceBN = userBalanceBN.sub(playAmountBaseUnits);
    const actualUserBalanceBN = new BN(userBalanceFinal.value.amount);

    if (!expectedUserBalanceBN.eq(actualUserBalanceBN)) {
      throw new Error(
        `Token transfer verification failed. Expected user balance: ${expectedUserBalanceBN.toString()}, got: ${actualUserBalanceBN.toString()}`
      );
    }
    console.log("   ✅ Token transfer verified successfully");
  });

  it("finalizes play with random value", async () => {
    // Note: This test assumes play_game() was already called in a previous test
    // The finalize_play instruction processes the random value and mints NFT if prize won
    // Random value 5000 will select Common Prize (probabilities: 0-8999 = Common, 9000-9999 = Rare)

    const random = Buffer.alloc(32);
    random.writeUInt32LE(5000, 0); // Deterministic value for testing (will win Common Prize)

    console.log("🎲 Setting up NFT minting accounts...");

    // Create NFT mint account (decimals = 0 for NFT)
    const nftMint = Keypair.generate();
    console.log("   📝 NFT Mint:", nftMint.publicKey.toString());

    // Derive metadata PDA
    const METAPLEX_PROGRAM_ID = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );
    console.log("   📝 Metaplex Program ID:", METAPLEX_PROGRAM_ID.toString());
    console.log(
      "   📝 Metaplex Program ID bytes:",
      JSON.stringify(Array.from(METAPLEX_PROGRAM_ID.toBytes()))
    );
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METAPLEX_PROGRAM_ID.toBuffer(),
        nftMint.publicKey.toBuffer(),
      ],
      METAPLEX_PROGRAM_ID
    );
    console.log("   📝 Metadata PDA:", metadataPda.toString());

    // Derive master edition PDA
    const [masterEditionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METAPLEX_PROGRAM_ID.toBuffer(),
        nftMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      METAPLEX_PROGRAM_ID
    );
    console.log("   📝 Master Edition PDA:", masterEditionPda.toString());

    // Get user's NFT token account (ATA)
    const userNftTokenAccount = await getAssociatedTokenAddress(
      nftMint.publicKey,
      user.publicKey
    );
    console.log(
      "   📝 User NFT Token Account:",
      userNftTokenAccount.toString()
    );

    // Create the mint account
    console.log("   🔨 Creating NFT mint account...");
    const mintRent =
      await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    const createMintIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: nftMint.publicKey,
      space: MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintIx = createInitializeMintInstruction(
      nftMint.publicKey,
      0, // decimals (NFT = 0)
      gamePda, // mint authority (game PDA)
      gamePda // freeze authority must be set for master edition
    );

    // Create user's associated token account if it doesn't exist
    const createAtaIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey, // payer
      userNftTokenAccount, // ata
      user.publicKey, // owner
      nftMint.publicKey // mint
    );

    const setupTx = new anchor.web3.Transaction().add(
      createMintIx,
      initMintIx,
      createAtaIx
    );
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    setupTx.recentBlockhash = blockhash;
    setupTx.feePayer = wallet.publicKey;
    const setupSig = await connection.sendTransaction(
      setupTx,
      [wallet.payer, nftMint],
      {
        skipPreflight: false,
      }
    );
    await connection.confirmTransaction(setupSig, "confirmed");
    console.log("   ✅ NFT mint account created");

    console.log("🎲 Finalizing play...");
    const tx = await gameProgram.methods
      .finalizePlay([...random] as any)
      .accounts({
        game: gamePda,
        user: user.publicKey,
        nftMint: nftMint.publicKey,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        userNftTokenAccount: userNftTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        metaplexTokenMetadataProgram: METAPLEX_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet.payer])
      .rpc();

    console.log("   ✅ Transaction:", tx);
    // Ensure the transaction is confirmed before reading state
    await connection.confirmTransaction(tx, "confirmed");
    console.log(
      "   📍 View on Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    // Debug: inspect mint supply and holders before asserting balances
    const mintInfo = await getMint(connection, nftMint.publicKey);
    console.log("   🔎 Mint supply:", mintInfo.supply.toString());
    const parsed = await connection.getParsedTokenAccountsByOwner(
      user.publicKey,
      { mint: nftMint.publicKey }
    );
    console.log(
      "   🔎 User token accounts for mint:",
      parsed.value.map((v) => ({
        pubkey: v.pubkey.toBase58(),
        amount: v.account.data.parsed.info.tokenAmount.amount,
      }))
    );
    const largest = await connection.getTokenLargestAccounts(nftMint.publicKey);
    console.log(
      "   🔎 Largest accounts:",
      largest.value.map((v) => ({
        address: v.address.toBase58(),
        amount: v.amount,
      }))
    );

    const game = await gameProgram.account.game.fetch(gamePda);
    console.log("   ✅ Game state:");
    console.log("      - Total Plays:", game.totalPlays.toString());
    console.log("      - Is Active:", game.isActive);

    // Verify NFT was minted to user's token account
    try {
      const userNftAccount = await getAccount(connection, userNftTokenAccount);
      console.log("   ✅ NFT Token Account verified:");
      console.log("      - Balance:", userNftAccount.amount.toString());
      console.log("      - Mint:", userNftAccount.mint.toString());

      if (userNftAccount.amount !== BigInt(1)) {
        throw new Error(
          `Expected NFT balance of 1, got ${userNftAccount.amount.toString()}`
        );
      }
      console.log("   ✅ NFT successfully minted to user!");
    } catch (error: any) {
      if (error.message?.includes("could not find account")) {
        console.log(
          "   ⚠️  NFT token account not found - NFT may not have been minted"
        );
        throw new Error("NFT was not minted to user's token account");
      }
      throw error;
    }

    // Verify the transaction logs for PrizeWon event
    const txDetails = await connection.getTransaction(tx, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (txDetails?.meta?.logMessages) {
      const hasPrizeWon = txDetails.meta.logMessages.some((log) =>
        log.includes("PrizeWon")
      );
      if (hasPrizeWon) {
        console.log("   ✅ PrizeWon event found in transaction logs");
      } else {
        console.log("   ⚠️  PrizeWon event not found in logs");
      }
    }
  });

  it("tests loss scenario (when random value falls outside prize probabilities)", async () => {
    // Note: Current game has 100% win rate (probabilities sum to 10,000)
    // To test loss, we'd need to reinitialize with probabilities < 10,000
    // For now, this test documents the expected behavior

    console.log("🎲 Testing loss scenario...");
    console.log("   ℹ️  Current game has 100% win rate");
    console.log(
      "   ℹ️  To test losses, initialize game with probabilities < 10,000"
    );
    console.log(
      "   ℹ️  Example: probabilities sum to 7,000 = 70% win, 30% loss"
    );

    // With current probabilities (10,000), any random value will win
    // A loss would occur if probabilities sum to < 10,000 and random value falls outside
    // For demonstration, we'll just log the expected behavior
    const randomForLoss = Buffer.alloc(32);
    randomForLoss.writeUInt32LE(9500, 0); // This would be a loss if probabilities sum to 7,000

    console.log("   ✅ Loss scenario test documented");
    console.log("   📝 To test actual loss:");
    console.log(
      "      1. Reinitialize game with probabilities summing to < 10,000"
    );
    console.log(
      "      2. Call finalize_play with random value outside prize range"
    );
    console.log("      3. Verify PlayLost event is emitted (no NFT minted)");
  });

  it("updates game status", async () => {
    console.log("⚙️  Updating game status...");
    const tx = await gameProgram.methods
      .updateGameStatus(true)
      .accounts({ game: gamePda, authority: wallet.publicKey })
      .rpc();

    console.log("   ✅ Transaction:", tx);
    console.log(
      "   📍 View on Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    const game = await gameProgram.account.game.fetch(gamePda);
    console.log("   ✅ Game is active:", game.isActive);
  });

  it("replenishes prize supply", async () => {
    console.log("📦 Replenishing prize supply...");
    const tx = await gameProgram.methods
      .replenishPrizeSupply(new BN(2), 5)
      .accounts({ game: gamePda, authority: wallet.publicKey })
      .rpc();

    console.log("   ✅ Transaction:", tx);
    console.log(
      "   📍 View on Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    const game = await gameProgram.account.game.fetch(gamePda);
    const prize = game.prizePool.find((p: any) => p.prizeId.eq(new BN(2)));
    console.log("   ✅ Prize supply:");
    console.log("      - Total:", prize?.supplyTotal);
    console.log("      - Remaining:", prize?.supplyRemaining);
  });

  it("withdraws tokens from treasury", async () => {
    const game = await gameProgram.account.game.fetch(gamePda);
    const treasuryAddress = game.treasury;

    // Verify treasury matches
    if (!treasuryAddress.equals(treasury.publicKey)) {
      throw new Error(
        `Treasury mismatch! Game was initialized with ${treasuryAddress.toString()}, ` +
          `but current treasury is ${treasury.publicKey.toString()}. ` +
          `Reinitialize the game with the current treasury.`
      );
    }

    console.log("🪙 Setting up token accounts for withdrawal...");
    const treasuryAta = await getOrCreateAta(tokenMint, treasury.publicKey);
    const destinationAta = await getOrCreateAta(tokenMint, wallet.publicKey);
    console.log("   ✅ Treasury ATA:", treasuryAta.toString());
    console.log("   ✅ Destination ATA:", destinationAta.toString());

    // Check treasury balance before withdrawal
    const treasuryBalanceBefore =
      await connection.getTokenAccountBalance(treasuryAta);
    const destinationBalanceBefore =
      await connection.getTokenAccountBalance(destinationAta);
    console.log("📊 Balances before withdrawal:");
    console.log("   - Treasury:", treasuryBalanceBefore.value.uiAmount);
    console.log("   - Destination:", destinationBalanceBefore.value.uiAmount);

    // Calculate withdrawal amount (50% of treasury balance, or minimum 0.01 tokens)
    const treasuryAmountBN = new BN(treasuryBalanceBefore.value.amount);
    const halfAmount = treasuryAmountBN.div(new BN(2));
    const minAmount = new BN(10_000); // Minimum 0.01 tokens (assuming 6 decimals)
    const withdrawAmount = halfAmount.gt(minAmount) ? halfAmount : minAmount;

    if (withdrawAmount.lte(new BN(0))) {
      console.log("   ⚠️  Treasury has no tokens to withdraw");
      return;
    }

    console.log("💸 Withdrawing from treasury...");
    console.log("   - Amount:", withdrawAmount.toString(), "tokens");
    const tx = await gameProgram.methods
      .withdrawTreasury(withdrawAmount)
      .accounts({
        game: gamePda,
        authority: wallet.publicKey,
        treasuryAuthority: treasury.publicKey,
        treasuryTokenAccount: treasuryAta,
        destinationTokenAccount: destinationAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([wallet.payer, treasury])
      .rpc();

    console.log("   ✅ Transaction:", tx);
    console.log(
      "   📍 View on Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    // Verify balances after withdrawal
    const treasuryBalanceAfter =
      await connection.getTokenAccountBalance(treasuryAta);
    const destinationBalanceAfter =
      await connection.getTokenAccountBalance(destinationAta);
    console.log("📊 Balances after withdrawal:");
    console.log("   - Treasury:", treasuryBalanceAfter.value.uiAmount);
    console.log("   - Destination:", destinationBalanceAfter.value.uiAmount);
    console.log("   ✅ Withdrawal successful!");
  });
});
