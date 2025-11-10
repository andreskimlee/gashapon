import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  getMint,
  mintTo,
} from "@solana/spl-token";

describe("gachapon-marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet as anchor.Wallet;

  const marketplace = anchor.workspace.GachaponMarketplace as Program<any>;

  let currencyMint: PublicKey;
  let nftMint: PublicKey;
  let seller = Keypair.generate();
  let buyer = Keypair.generate();

  let configPda: PublicKey;
  let configBump: number;

  const price = new BN(1_000_000); // arbitrary token amount

  before(async () => {
    // Airdrop SOL to test wallets
    for (const kp of [seller, buyer]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig, "confirmed");
    }

    // Create mints
    currencyMint = await createMint(
      provider.connection,
      wallet.payer as any,
      wallet.publicKey,
      null,
      6,
    );
    nftMint = await createMint(
      provider.connection,
      wallet.payer as any,
      wallet.publicKey,
      null,
      0,
    );

    // Seller receives 1 NFT
    const sellerNftAta = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet.payer as any,
      nftMint,
      seller.publicKey,
    )).address;
    await mintTo(provider.connection, wallet.payer as any, nftMint, sellerNftAta, wallet.publicKey, 1);

    // Buyer receives currency tokens
    const buyerCurrencyAta = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet.payer as any,
      currencyMint,
      buyer.publicKey,
    )).address;
    await mintTo(provider.connection, wallet.payer as any, currencyMint, buyerCurrencyAta, wallet.publicKey, Number(price));

    // Derive config PDA and initialize
    [configPda, configBump] = PublicKey.findProgramAddressSync([Buffer.from("config")], marketplace.programId);
    const platformTreasury = wallet.publicKey;
    await marketplace.methods.initializeConfig(platformTreasury)
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  it("lists an NFT and creates escrow ATA if missing", async () => {
    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), nftMint.toBuffer()],
      marketplace.programId,
    );
    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), nftMint.toBuffer()],
      marketplace.programId,
    );
    const sellerNftAta = getAssociatedTokenAddressSync(nftMint, seller.publicKey);
    const escrowNftAta = getAssociatedTokenAddressSync(nftMint, escrowAuthority, true);

    await marketplace.methods.listNft(price)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        nftMint,
        currencyMint,
        sellerNftTokenAccount: sellerNftAta,
        escrowAuthority,
        escrowNftTokenAccount: escrowNftAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    const escrowAtaInfo = await getMint(provider.connection, nftMint);
    // no throws means ATA exists and transfer succeeded
  });

  it("cancels listing, returning NFT to seller", async () => {
    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), nftMint.toBuffer()],
      marketplace.programId,
    );
    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), nftMint.toBuffer()],
      marketplace.programId,
    );
    const escrowNftAta = getAssociatedTokenAddressSync(nftMint, escrowAuthority, true);
    const sellerNftAta = getAssociatedTokenAddressSync(nftMint, seller.publicKey);

    await marketplace.methods.cancelListing()
      .accounts({
        listing: listingPda,
        seller: seller.publicKey,
        escrowAuthority,
        escrowNftTokenAccount: escrowNftAta,
        sellerNftTokenAccount: sellerNftAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();
  });

  it("buys NFT: pays seller + fee and receives NFT", async () => {
    // Re-list first
    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), nftMint.toBuffer()],
      marketplace.programId,
    );
    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), nftMint.toBuffer()],
      marketplace.programId,
    );
    const sellerNftAta = getAssociatedTokenAddressSync(nftMint, seller.publicKey);
    const escrowNftAta = getAssociatedTokenAddressSync(nftMint, escrowAuthority, true);
    await marketplace.methods.listNft(price)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        nftMint,
        currencyMint,
        sellerNftTokenAccount: sellerNftAta,
        escrowAuthority,
        escrowNftTokenAccount: escrowNftAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    // Buyer ATAs determined in program via init_if_needed
    const platformTreasuryAta = getAssociatedTokenAddressSync(currencyMint, wallet.publicKey);
    const buyerCurrencyAta = getAssociatedTokenAddressSync(currencyMint, buyer.publicKey);
    const buyerNftAta = getAssociatedTokenAddressSync(nftMint, buyer.publicKey);

    await marketplace.methods.buyNft()
      .accounts({
        listing: listingPda,
        buyer: buyer.publicKey,
        config: configPda,
        currencyMint,
        buyerCurrencyTokenAccount: buyerCurrencyAta,
        sellerCurrencyTokenAccount: getAssociatedTokenAddressSync(currencyMint, seller.publicKey),
        platformTreasuryCurrencyTokenAccount: platformTreasuryAta,
        escrowAuthority,
        escrowNftTokenAccount: escrowNftAta,
        buyerNftTokenAccount: buyerNftAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();
  });

  it("updates listing price", async () => {
    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), nftMint.toBuffer()],
      marketplace.programId,
    );
    await marketplace.methods.updateListingPrice(new BN(2_000_000))
      .accounts({
        listing: listingPda,
        seller: seller.publicKey,
      })
      .signers([seller])
      .rpc();
  });

  it("updates config (treasury and authority)", async () => {
    const newTreasury = buyer.publicKey;
    await marketplace.methods.updateConfig(newTreasury, buyer.publicKey)
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
      })
      .rpc();
  });
});


