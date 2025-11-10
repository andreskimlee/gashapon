import { keypairIdentity, Metaplex } from "@metaplex-foundation/js";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PublicKey } from "@solana/web3.js";
import { SolanaService } from "./solana.service";

@Injectable()
export class MetaplexService {
  private metaplex: Metaplex;

  constructor(
    private solanaService: SolanaService,
    private configService: ConfigService
  ) {
    const connection = this.solanaService.getConnection();
    const payer = this.solanaService.getPayer();

    this.metaplex = Metaplex.make(connection).use(keypairIdentity(payer));
  }

  /**
   * Get NFT metadata
   */
  async getNFTMetadata(mintAddress: string): Promise<any> {
    const mint = new PublicKey(mintAddress);
    const nft = await this.metaplex.nfts().findByMint({ mintAddress: mint });
    return nft;
  }

  /**
   * Get NFT owner
   */
  async getNFTOwner(mintAddress: string): Promise<string> {
    const mint = new PublicKey(mintAddress);
    const nft = await this.metaplex.nfts().findByMint({ mintAddress: mint });

    if (!nft) {
      throw new Error(`NFT ${mintAddress} not found`);
    }

    // Check if it's an NFT (not SFT) and has owner property
    if ("owner" in nft && nft.owner) {
      return nft.owner.toString();
    }

    // Fallback: Get owner from token accounts
    // For NFTs, find the token account with balance = 1
    const connection = this.solanaService.getConnection();
    const tokenProgramId = new PublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    );

    const accounts = await connection.getParsedProgramAccounts(tokenProgramId, {
      filters: [
        {
          dataSize: 165, // Token account size
        },
        {
          memcmp: {
            offset: 0,
            bytes: mint.toBase58(),
          },
        },
      ],
    });

    if (accounts.length === 0) {
      throw new Error(`NFT ${mintAddress} has no token accounts`);
    }

    // Find the account with balance = 1 (NFT ownership)
    for (const account of accounts) {
      const parsedInfo = account.account.data as any;
      if (parsedInfo.parsed && parsedInfo.parsed.info) {
        const balance = parsedInfo.parsed.info.tokenAmount?.uiAmount;
        if (balance === 1) {
          return parsedInfo.parsed.info.owner;
        }
      }
    }

    // If no account with balance 1, return owner of first account
    const firstAccount = accounts[0];
    const parsedInfo = firstAccount.account.data as any;
    if (
      parsedInfo.parsed &&
      parsedInfo.parsed.info &&
      parsedInfo.parsed.info.owner
    ) {
      return parsedInfo.parsed.info.owner;
    }

    throw new Error(`Could not determine owner for NFT ${mintAddress}`);
  }

  /**
   * Burn NFT
   */
  async burnNFT(mintAddress: string, owner: PublicKey): Promise<string> {
    const mint = new PublicKey(mintAddress);

    // Verify ownership
    const currentOwner = await this.getNFTOwner(mintAddress);
    if (currentOwner !== owner.toString()) {
      throw new Error("NFT is not owned by this wallet");
    }

    // Burn the NFT
    const result = await this.metaplex.nfts().delete({
      mintAddress: mint,
    });

    // Extract signature from response
    return result.response.signature;
  }

  /**
   * Mint prize NFT
   */
  async mintPrizeNFT(params: {
    metadataUri: string;
    name: string;
    symbol: string;
    recipient: PublicKey;
    attributes?: Array<{ trait_type: string; value: string }>;
  }): Promise<{ mintAddress: string; signature: string }> {
    const { nft } = await this.metaplex.nfts().create({
      uri: params.metadataUri,
      name: params.name,
      symbol: params.symbol,
      sellerFeeBasisPoints: 0, // No royalties for prize NFTs
      creators: [
        {
          address: this.metaplex.identity().publicKey,
          share: 100,
        },
      ],
    });

    // Transfer to recipient
    await this.metaplex.nfts().transfer({
      nftOrSft: nft,
      toOwner: params.recipient,
    });

    return {
      mintAddress: nft.address.toString(),
      signature: "", // TODO: Get transaction signature
    };
  }
}
