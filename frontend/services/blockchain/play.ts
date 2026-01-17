import {
  GAME_PROGRAM_ID,
  SOLANA_RPC_URL,
  TOKEN_MINT,
  TREASURY_WALLET,
} from "@/utils/constants";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

// Anchor discriminator for play_game from IDL
const PLAY_GAME_DISCRIMINATOR = Uint8Array.from([
  37, 88, 207, 85, 42, 144, 122, 197,
]);
const FINALIZE_PLAY_DISCRIMINATOR = Uint8Array.from([
  217, 0, 74, 63, 118, 193, 160, 9,
]);
const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

// Max prizes constant (must match on-chain)
const MAX_PRIZES = 16;

function toLEU64(value: bigint | number): Uint8Array {
  let x = BigInt(value as any);
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    // @ts-ignore
    out[i] = Number(x & BigInt(0xff));
    // @ts-ignore
    x = x >> BigInt(8);
  }
  return out;
}

// Minimal ATA derivation without importing full helpers
export function findAssociatedTokenAddress(
  owner: PublicKey,
  mint: PublicKey
): PublicKey {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

// Derive prize PDA
export function findPrizePda(gamePda: PublicKey, prizeIndex: number): PublicKey {
  const programId = new PublicKey(GAME_PROGRAM_ID!);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("prize"), gamePda.toBuffer(), Buffer.from([prizeIndex])],
    programId
  )[0];
}

// Parse Game account to get prize probabilities and token mint
interface GameAccountData {
  prizeCount: number;
  prizeProbabilities: number[];
  isActive: boolean;
  tokenMint: PublicKey;
  treasury: PublicKey;
}

async function fetchGameAccountData(
  connection: Connection,
  gamePda: PublicKey
): Promise<GameAccountData> {
  const accountInfo = await connection.getAccountInfo(gamePda);
  if (!accountInfo) {
    throw new Error("Game account not found");
  }

  const data = accountInfo.data;
  
  // Parse Game account layout:
  // [0..8]     - discriminator
  // [8..40]    - authority (32)
  // [40..48]   - game_id (8)
  // [48..52]   - name length (4)
  // [52..52+nameLen] - name bytes
  // Then: description, image_url, token_mint, cost_usd, treasury
  // Then: prize_count (1), prize_probabilities (16*2 = 32), total_supply_remaining (4)
  //       total_plays (8), is_active (1), last_random_value (32), bump (1)
  
  let offset = 8; // Skip discriminator
  offset += 32;   // authority
  offset += 8;    // game_id
  
  // Read name (String = 4 byte len + bytes)
  const nameLen = data.readUInt32LE(offset);
  offset += 4 + nameLen;
  
  // Read description
  const descLen = data.readUInt32LE(offset);
  offset += 4 + descLen;
  
  // Read image_url
  const imgLen = data.readUInt32LE(offset);
  offset += 4 + imgLen;
  
  // Read token_mint (32 bytes)
  const tokenMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  
  offset += 8;   // cost_usd
  
  // Read treasury (32 bytes)
  const treasury = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  
  // prize_count (1 byte)
  const prizeCount = data[offset];
  offset += 1;
  
  // prize_probabilities ([u16; 16] = 32 bytes)
  const prizeProbabilities: number[] = [];
  for (let i = 0; i < MAX_PRIZES; i++) {
    prizeProbabilities.push(data.readUInt16LE(offset + i * 2));
  }
  offset += MAX_PRIZES * 2;
  
  offset += 4;  // total_supply_remaining
  offset += 8;  // total_plays
  
  const isActive = data[offset] === 1;
  
  return {
    prizeCount,
    prizeProbabilities,
    isActive,
    tokenMint,
    treasury,
  };
}

// Select prize index based on random value and probabilities
function selectPrizeIndex(
  probabilities: number[],
  prizeCount: number,
  randomValue: Uint8Array
): number | null {
  // Convert first 8 bytes to u64 and normalize to 0..9999
  const view = new DataView(randomValue.buffer, randomValue.byteOffset, 8);
  const randU64 = view.getBigUint64(0, true);
  const draw = Number(randU64 % BigInt(10000));
  
  let cumulative = 0;
  for (let idx = 0; idx < prizeCount; idx++) {
    const prob = probabilities[idx];
    if (prob === 0) continue;
    cumulative += prob;
    if (draw < cumulative) {
      return idx;
    }
  }
  return null; // Loss - draw fell outside prize probability range
}

/**
 * Play game - token transfer only
 * Use this for the simple flow where backend handles finalization
 * Reads token_mint and treasury from the game account itself
 */
export async function playOnChain(opts: {
  walletPublicKey: PublicKey;
  gamePda: string;
  tokenAmount: number | bigint;
}): Promise<Transaction> {
  if (!GAME_PROGRAM_ID) throw new Error("GAME_PROGRAM_ID not configured");

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(GAME_PROGRAM_ID);
  const gamePubkey = new PublicKey(opts.gamePda);
  const user = opts.walletPublicKey;
  
  // Fetch game account to get token_mint and treasury
  const gameData = await fetchGameAccountData(connection, gamePubkey);
  const mint = gameData.tokenMint;
  const treasury = gameData.treasury;

  const userTokenAccount = findAssociatedTokenAddress(user, mint);
  const treasuryTokenAccount = findAssociatedTokenAddress(treasury, mint);

  // Instruction data = discriminator + u64 token_amount
  const amountLE = toLEU64(opts.tokenAmount);
  const data = new Uint8Array(PLAY_GAME_DISCRIMINATOR.length + amountLE.length);
  data.set(PLAY_GAME_DISCRIMINATOR, 0);
  data.set(amountLE, PLAY_GAME_DISCRIMINATOR.length);

  const keys = [
    { pubkey: gamePubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const ix = new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(data),
  });

  const tx = new Transaction();
  // Ensure user ATA exists
  const userAtaInfo = await connection.getAccountInfo(userTokenAccount);
  if (!userAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        userTokenAccount,
        user,
        mint
      )
    );
  }
  // Ensure treasury ATA exists
  const treasuryAtaInfo = await connection.getAccountInfo(treasuryTokenAccount);
  if (!treasuryAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        treasuryTokenAccount,
        treasury,
        mint
      )
    );
  }
  // Play instruction
  tx.add(ix);
  tx.feePayer = user;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  return tx;
}

/**
 * Build finalize_play transaction with the winning prize account
 * This is called after determining the outcome (e.g., from backend VRF)
 */
export async function finalizeOnChain(opts: {
  walletPublicKey: PublicKey;
  gamePda: string;
  randomValue: Uint8Array;
  winningPrizeIndex: number | null;
}): Promise<{ tx: Transaction; mint: Keypair }> {
  if (!GAME_PROGRAM_ID) throw new Error("GAME_PROGRAM_ID not configured");
  
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(GAME_PROGRAM_ID);
  const gamePubkey = new PublicKey(opts.gamePda);
  const user = opts.walletPublicKey;
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );

  // Create new mint with authority = game PDA, decimals = 0
  const mint = Keypair.generate();
  const rentLamports = await getMinimumBalanceForRentExemptMint(connection);
  const createMintIx = SystemProgram.createAccount({
    fromPubkey: user,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports: rentLamports,
    programId: TOKEN_PROGRAM_ID,
  });
  const initMintIx = createInitializeMint2Instruction(
    mint.publicKey,
    0, // decimals
    gamePubkey, // mint authority = game PDA
    gamePubkey // freeze authority = game PDA
  );

  // Derive Metadata and Master Edition PDAs
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  );

  // Ensure user's NFT ATA exists
  const userNftAta = findAssociatedTokenAddress(user, mint.publicKey);
  const ataInfo = await connection.getAccountInfo(userNftAta);
  const ensureUserAtaIx = !ataInfo
    ? createAssociatedTokenAccountInstruction(
        user,
        userNftAta,
        user,
        mint.publicKey
      )
    : null;

  // Build finalize_play instruction
  const data = new Uint8Array(FINALIZE_PLAY_DISCRIMINATOR.length + 32);
  data.set(FINALIZE_PLAY_DISCRIMINATOR, 0);
  data.set(opts.randomValue, FINALIZE_PLAY_DISCRIMINATOR.length);

  const keys = [
    { pubkey: gamePubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: mint.publicKey, isSigner: false, isWritable: true },
    { pubkey: metadataPda, isSigner: false, isWritable: true },
    { pubkey: masterEditionPda, isSigner: false, isWritable: true },
    { pubkey: userNftAta, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"),
      isSigner: false,
      isWritable: false,
    },
  ];

  // If there's a winning prize, add it as remaining account
  if (opts.winningPrizeIndex !== null) {
    const prizePda = findPrizePda(gamePubkey, opts.winningPrizeIndex);
    keys.push({ pubkey: prizePda, isSigner: false, isWritable: true });
  }

  const finalizeIx = new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(data),
  });

  const tx = new Transaction();
  tx.add(createMintIx, initMintIx);
  if (ensureUserAtaIx) tx.add(ensureUserAtaIx);
  tx.add(finalizeIx);

  tx.feePayer = user;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.partialSign(mint);
  
  return { tx, mint };
}

/**
 * Full flow: play_game + finalize_play in one transaction
 * Determines winner client-side using on-chain probabilities
 * Reads token_mint and treasury from the game account itself
 * 
 * If costUsdCents is provided, calculates token amount dynamically using pump.fun price API.
 * Otherwise, uses the provided tokenAmount (legacy behavior).
 */
export async function playAndFinalizeOnChain(opts: {
  walletPublicKey: PublicKey;
  gamePda: string;
  tokenAmount?: number | bigint;
  costUsdCents?: number;
}): Promise<{ tx: Transaction; mint: Keypair; isWin: boolean; prizeIndex: number | null; tokenAmountPaid: bigint }> {
  if (!GAME_PROGRAM_ID) throw new Error("GAME_PROGRAM_ID not configured");

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(GAME_PROGRAM_ID);
  const gamePubkey = new PublicKey(opts.gamePda);
  const user = opts.walletPublicKey;
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );

  // Fetch game account to get prize probabilities, token_mint, and treasury
  const gameData = await fetchGameAccountData(connection, gamePubkey);
  if (!gameData.isActive) {
    throw new Error("Game is not active");
  }

  // Use the game's token mint and treasury from on-chain data
  const mintAddress = gameData.tokenMint;
  const treasury = gameData.treasury;
  
  console.log("Using game's token mint:", mintAddress.toString());
  console.log("Using game's treasury:", treasury.toString());

  // Calculate token amount: use pump.fun price API if costUsdCents provided
  let finalTokenAmount: bigint;
  
  if (opts.costUsdCents !== undefined) {
    // Dynamic calculation using pump.fun price API
    const { calculateTokenAmount } = await import("@/services/price/pump-fun");
    const priceResult = await calculateTokenAmount(
      opts.costUsdCents,
      mintAddress.toString(),
      6, // pump.fun tokens typically have 6 decimals
      0.02 // 2% slippage tolerance
    );
    
    if (!priceResult) {
      throw new Error(`Could not fetch token price for ${mintAddress.toString()}. Please try again.`);
    }
    
    finalTokenAmount = priceResult.tokenAmount;
    console.log(`Calculated token amount: ${finalTokenAmount} tokens for $${(opts.costUsdCents / 100).toFixed(2)} @ $${priceResult.priceUsd.toFixed(10)}/token`);
  } else if (opts.tokenAmount !== undefined) {
    // Legacy: use provided token amount directly
    finalTokenAmount = BigInt(opts.tokenAmount);
    console.log(`Using provided token amount: ${finalTokenAmount}`);
  } else {
    throw new Error("Either tokenAmount or costUsdCents must be provided");
  }

  const userTokenAccount = findAssociatedTokenAddress(user, mintAddress);
  const treasuryTokenAccount = findAssociatedTokenAddress(treasury, mintAddress);

  // Build play_game instruction data
  const amountLE = toLEU64(finalTokenAmount);
  const playData = new Uint8Array(
    PLAY_GAME_DISCRIMINATOR.length + amountLE.length
  );
  playData.set(PLAY_GAME_DISCRIMINATOR, 0);
  playData.set(amountLE, PLAY_GAME_DISCRIMINATOR.length);

  const playKeys = [
    { pubkey: gamePubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  const playIx = new TransactionInstruction({
    programId,
    keys: playKeys,
    data: Buffer.from(playData),
  });

  // Generate random value and determine winner
  const randomValue = crypto.getRandomValues(new Uint8Array(32));
  const winningPrizeIndex = selectPrizeIndex(
    gameData.prizeProbabilities,
    gameData.prizeCount,
    randomValue
  );
  const isWin = winningPrizeIndex !== null;

  // Prepare NFT mint
  const prizeMint = Keypair.generate();
  const rentLamports = await getMinimumBalanceForRentExemptMint(connection);
  const createPrizeMintIx = SystemProgram.createAccount({
    fromPubkey: user,
    newAccountPubkey: prizeMint.publicKey,
    space: MINT_SIZE,
    lamports: rentLamports,
    programId: TOKEN_PROGRAM_ID,
  });
  const initPrizeMintIx = createInitializeMint2Instruction(
    prizeMint.publicKey,
    0,
    gamePubkey,
    gamePubkey
  );

  // Derive Metaplex PDAs
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      prizeMint.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      prizeMint.publicKey.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  );

  // User's prize ATA
  const userPrizeAta = findAssociatedTokenAddress(user, prizeMint.publicKey);
  const userPrizeAtaInfo = await connection.getAccountInfo(userPrizeAta);
  const ensureUserPrizeAtaIx = !userPrizeAtaInfo
    ? createAssociatedTokenAccountInstruction(
        user,
        userPrizeAta,
        user,
        prizeMint.publicKey
      )
    : null;

  // Build finalize_play instruction
  const finData = new Uint8Array(
    FINALIZE_PLAY_DISCRIMINATOR.length + randomValue.length
  );
  finData.set(FINALIZE_PLAY_DISCRIMINATOR, 0);
  finData.set(randomValue, FINALIZE_PLAY_DISCRIMINATOR.length);

  const finKeys = [
    { pubkey: gamePubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: prizeMint.publicKey, isSigner: false, isWritable: true },
    { pubkey: metadataPda, isSigner: false, isWritable: true },
    { pubkey: masterEditionPda, isSigner: false, isWritable: true },
    { pubkey: userPrizeAta, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"),
      isSigner: false,
      isWritable: false,
    },
  ];

  // Add winning prize as remaining account if there's a winner
  if (winningPrizeIndex !== null) {
    const prizePda = findPrizePda(gamePubkey, winningPrizeIndex);
    finKeys.push({ pubkey: prizePda, isSigner: false, isWritable: true });
  }

  const finalizeIx = new TransactionInstruction({
    programId,
    keys: finKeys,
    data: Buffer.from(finData),
  });

  // Build full transaction
  const tx = new Transaction();
  
  // Ensure ATAs for token transfer
  const userAtaInfo = await connection.getAccountInfo(userTokenAccount);
  if (!userAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        userTokenAccount,
        user,
        mintAddress
      )
    );
  }
  const treasuryAtaInfo = await connection.getAccountInfo(treasuryTokenAccount);
  if (!treasuryAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        treasuryTokenAccount,
        treasury,
        mintAddress
      )
    );
  }

  // Order: play -> create prize mint -> init -> ensure user prize ATA -> finalize
  tx.add(playIx, createPrizeMintIx, initPrizeMintIx);
  if (ensureUserPrizeAtaIx) tx.add(ensureUserPrizeAtaIx);
  tx.add(finalizeIx);

  // Prepare for signing
  tx.feePayer = user;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.partialSign(prizeMint);

  return { tx, mint: prizeMint, isWin, prizeIndex: winningPrizeIndex, tokenAmountPaid: finalTokenAmount };
}
