import {
  GAME_PROGRAM_ID,
  SOLANA_RPC_URL
} from "@/utils/constants";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  getMint,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

// Anchor discriminators from IDL
const PLAY_GAME_DISCRIMINATOR = Uint8Array.from([
  37, 88, 207, 85, 42, 144, 122, 197,
]);
const CLAIM_PRIZE_DISCRIMINATOR = Uint8Array.from([
  157, 233, 139, 121, 246, 62, 234, 235,
]);
const CLOSE_PLAY_SESSION_DISCRIMINATOR = Uint8Array.from([
  104, 80, 12, 193, 178, 215, 87, 53,
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

// ATA derivation - defaults to Token-2022 for GRABBIT, but can specify legacy for NFTs
export function findAssociatedTokenAddress(
  owner: PublicKey,
  mint: PublicKey,
  tokenProgramId: PublicKey = TOKEN_2022_PROGRAM_ID
): PublicKey {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

// Derive config PDA
export function findConfigPda(): PublicKey {
  const programId = new PublicKey(GAME_PROGRAM_ID!);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
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

// Derive play session PDA using session_seed
export function findPlaySessionPda(gamePda: PublicKey, user: PublicKey, sessionSeed: Uint8Array): PublicKey {
  const programId = new PublicKey(GAME_PROGRAM_ID!);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("session"), gamePda.toBuffer(), user.toBuffer(), sessionSeed],
    programId
  )[0];
}

// Generate a unique session seed
export function generateSessionSeed(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Parse Game account to get prize probabilities and token mint
interface GameAccountData {
  prizeCount: number;
  prizeProbabilities: number[];
  isActive: boolean;
  tokenMint: PublicKey;
  treasury: PublicKey;
}

export async function fetchGameAccountData(
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

// Parse PlaySession account
export interface PlaySessionData {
  user: PublicKey;
  game: PublicKey;
  amountPaid: bigint;
  sessionSeed: Uint8Array;
  isFulfilled: boolean;
  randomValue: Uint8Array;
  prizeIndex: number | null;
  isClaimed: boolean;
}

export async function fetchPlaySessionData(
  connection: Connection,
  sessionPda: PublicKey
): Promise<PlaySessionData | null> {
  const accountInfo = await connection.getAccountInfo(sessionPda);
  if (!accountInfo) {
    return null;
  }

  const data = accountInfo.data;
  
  // Parse PlaySession account layout:
  // [0..8]     - discriminator
  // [8..40]    - user (32)
  // [40..72]   - game (32)
  // [72..80]   - amount_paid (8)
  // [80..88]   - created_slot (8)
  // [88..89]   - is_fulfilled (1)
  // [89..121]  - random_value (32)
  // [121..123] - prize_index Option<u8> (1 + 1)
  // [123..124] - is_claimed (1)
  // [124..125] - bump (1)
  
  let offset = 8; // Skip discriminator
  
  const user = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  
  const game = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  
  const amountPaid = data.readBigUInt64LE(offset);
  offset += 8;
  
  const sessionSeed = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  
  const isFulfilled = data[offset] === 1;
  offset += 1;
  
  const randomValue = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  
  // Option<u8> - first byte is 0 (None) or 1 (Some), second byte is value
  const hasPrize = data[offset] === 1;
  const prizeIndex = hasPrize ? data[offset + 1] : null;
  offset += 2;
  
  const isClaimed = data[offset] === 1;
  
  return {
    user,
    game,
    amountPaid,
    sessionSeed,
    isFulfilled,
    randomValue,
    prizeIndex,
    isClaimed,
  };
}

/**
 * Play game - creates a PlaySession and transfers tokens to treasury
 * Returns the transaction and the session PDA
 * 
 * SECURITY: This only creates the session. The backend must call finalize_play
 * with a random value to determine the outcome. Users cannot determine their own outcome.
 */
export async function playOnChain(opts: {
  walletPublicKey: PublicKey;
  gamePda: string;
  tokenAmount?: number | bigint;
  costUsdCents?: number;
}): Promise<{ tx: Transaction; sessionPda: PublicKey; sessionSeed: Uint8Array; tokenAmountPaid: bigint }> {
  if (!GAME_PROGRAM_ID) throw new Error("GAME_PROGRAM_ID not configured");

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(GAME_PROGRAM_ID);
  const gamePubkey = new PublicKey(opts.gamePda);
  const user = opts.walletPublicKey;
  
  // Fetch game account to get token_mint and treasury
  const gameData = await fetchGameAccountData(connection, gamePubkey);
  if (!gameData.isActive) {
    throw new Error("Game is not active");
  }
  
  const mint = gameData.tokenMint;
  const treasury = gameData.treasury;

  // Calculate token amount
  let finalTokenAmount: bigint;
  
  if (opts.costUsdCents !== undefined) {
    // Fetch actual token decimals from chain (using Token-2022)
    let tokenDecimals = 6;
    try {
      const mintInfo = await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID);
      tokenDecimals = mintInfo.decimals;
    } catch (e) {
      console.warn(`Could not fetch token decimals, using default ${tokenDecimals}:`, e);
    }
    
    // Dynamic calculation using pump.fun price API
    const { calculateTokenAmount } = await import("@/services/price/pump-fun");
    const priceResult = await calculateTokenAmount(
      opts.costUsdCents,
      mint.toString(),
      tokenDecimals,
      0.02
    );
    
    if (!priceResult) {
      throw new Error(`Could not fetch token price for ${mint.toString()}. Please try again.`);
    }
    
    finalTokenAmount = priceResult.tokenAmount;
  } else if (opts.tokenAmount !== undefined) {
    finalTokenAmount = BigInt(opts.tokenAmount);
  } else {
    throw new Error("Either tokenAmount or costUsdCents must be provided");
  }

  // Derive ATAs using Token-2022
  const userTokenAccount = findAssociatedTokenAddress(user, mint);
  const treasuryTokenAccount = findAssociatedTokenAddress(treasury, mint);

  // Generate unique session seed for PDA derivation
  const sessionSeed = generateSessionSeed();
  const sessionPda = findPlaySessionPda(gamePubkey, user, sessionSeed);

  // Instruction data = discriminator + u64 token_amount + [u8; 32] session_seed
  const amountLE = toLEU64(finalTokenAmount);
  const data = new Uint8Array(PLAY_GAME_DISCRIMINATOR.length + amountLE.length + 32);
  data.set(PLAY_GAME_DISCRIMINATOR, 0);
  data.set(amountLE, PLAY_GAME_DISCRIMINATOR.length);
  data.set(sessionSeed, PLAY_GAME_DISCRIMINATOR.length + amountLE.length);

  const keys = [
    { pubkey: gamePubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false }, // token_mint for transfer_checked
    { pubkey: sessionPda, isSigner: false, isWritable: true },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const ix = new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(data),
  });

  const tx = new Transaction();
  
  // Ensure user ATA exists (Token-2022)
  const userAtaInfo = await connection.getAccountInfo(userTokenAccount);
  if (!userAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        userTokenAccount,
        user,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }
  
  // Ensure treasury ATA exists (Token-2022)
  const treasuryAtaInfo = await connection.getAccountInfo(treasuryTokenAccount);
  if (!treasuryAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        treasuryTokenAccount,
        treasury,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }
  
  // Play instruction
  tx.add(ix);
  tx.feePayer = user;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  return { tx, sessionPda, sessionSeed, tokenAmountPaid: finalTokenAmount };
}

/**
 * Claim prize - mints NFT after backend has finalized the play session
 * Only callable if session.is_fulfilled = true and session.prize_index is Some
 */
export async function claimPrize(opts: {
  walletPublicKey: PublicKey;
  gamePda: string;
  sessionPda: string;
  prizeIndex: number;
}): Promise<{ tx: Transaction; mint: Keypair }> {
  if (!GAME_PROGRAM_ID) throw new Error("GAME_PROGRAM_ID not configured");
  
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(GAME_PROGRAM_ID);
  const gamePubkey = new PublicKey(opts.gamePda);
  const sessionPubkey = new PublicKey(opts.sessionPda);
  const user = opts.walletPublicKey;
  const prizePda = findPrizePda(gamePubkey, opts.prizeIndex);
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );

  // Create new mint for the NFT
  const nftMint = Keypair.generate();
  const rentLamports = await getMinimumBalanceForRentExemptMint(connection);
  
  const createMintIx = SystemProgram.createAccount({
    fromPubkey: user,
    newAccountPubkey: nftMint.publicKey,
    space: MINT_SIZE,
    lamports: rentLamports,
    programId: TOKEN_PROGRAM_ID,
  });
  
  const initMintIx = createInitializeMint2Instruction(
    nftMint.publicKey,
    0, // decimals for NFT
    gamePubkey, // mint authority = game PDA
    gamePubkey  // freeze authority = game PDA
  );

  // Derive Metadata and Master Edition PDAs
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      nftMint.publicKey.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      nftMint.publicKey.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  );

  // User's NFT ATA (NFTs use legacy Token Program)
  const userNftAta = findAssociatedTokenAddress(user, nftMint.publicKey, TOKEN_PROGRAM_ID);
  const ataInfo = await connection.getAccountInfo(userNftAta);
  const ensureAtaIx = !ataInfo
    ? createAssociatedTokenAccountInstruction(user, userNftAta, user, nftMint.publicKey, TOKEN_PROGRAM_ID)
    : null;

  // Build claim_prize instruction
  const data = new Uint8Array(CLAIM_PRIZE_DISCRIMINATOR.length);
  data.set(CLAIM_PRIZE_DISCRIMINATOR, 0);

  const keys = [
    { pubkey: sessionPubkey, isSigner: false, isWritable: true },
    { pubkey: gamePubkey, isSigner: false, isWritable: false },
    { pubkey: prizePda, isSigner: false, isWritable: false },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: nftMint.publicKey, isSigner: false, isWritable: true },
    { pubkey: metadataPda, isSigner: false, isWritable: true },
    { pubkey: masterEditionPda, isSigner: false, isWritable: true },
    { pubkey: userNftAta, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
  ];

  const claimIx = new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(data),
  });

  const tx = new Transaction();
  tx.add(createMintIx, initMintIx);
  if (ensureAtaIx) tx.add(ensureAtaIx);
  tx.add(claimIx);

  tx.feePayer = user;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.partialSign(nftMint);

  return { tx, mint: nftMint };
}

/**
 * Close play session - returns rent to user
 * Only callable if session.is_fulfilled = true AND (is_claimed = true OR prize_index is None)
 */
export async function closePlaySession(opts: {
  walletPublicKey: PublicKey;
  sessionPda: string;
}): Promise<Transaction> {
  if (!GAME_PROGRAM_ID) throw new Error("GAME_PROGRAM_ID not configured");
  
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const programId = new PublicKey(GAME_PROGRAM_ID);
  const sessionPubkey = new PublicKey(opts.sessionPda);
  const user = opts.walletPublicKey;

  const data = new Uint8Array(CLOSE_PLAY_SESSION_DISCRIMINATOR.length);
  data.set(CLOSE_PLAY_SESSION_DISCRIMINATOR, 0);

  const keys = [
    { pubkey: sessionPubkey, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
  ];

  const ix = new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(data),
  });

  const tx = new Transaction();
  tx.add(ix);
  tx.feePayer = user;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  return tx;
}

/**
 * Poll for play session fulfillment
 * Returns the session data when fulfilled, or null if not yet fulfilled
 */
export async function pollSessionFulfillment(
  sessionPda: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<PlaySessionData | null> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const sessionPubkey = new PublicKey(sessionPda);
  
  for (let i = 0; i < maxAttempts; i++) {
    const sessionData = await fetchPlaySessionData(connection, sessionPubkey);
    
    if (sessionData?.isFulfilled) {
      return sessionData;
    }
    
    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  return null;
}
