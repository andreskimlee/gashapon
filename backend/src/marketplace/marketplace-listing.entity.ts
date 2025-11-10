import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { NftEntity } from '../nft/nft.entity';

@Entity('marketplace_listings')
@Index(['isActive', 'priceInTokens'])
@Index(['sellerWallet', 'isActive'])
@Index(['nftMint', 'isActive'])
export class MarketplaceListingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  nftMint: string;

  @Column({ type: 'varchar', length: 44, unique: true, nullable: true })
  onChainListingAddress: string | null;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  sellerWallet: string;

  @Column({ type: 'bigint' })
  priceInTokens: number;

  @Column({ type: 'bigint', nullable: true })
  priceInSol: number | null;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn()
  @Index()
  listedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  soldAt: Date | null;

  @Column({ type: 'varchar', length: 44, nullable: true })
  buyerWallet: string | null;

  @Column({ type: 'varchar', length: 88, nullable: true })
  saleTx: string | null;

  @ManyToOne(() => NftEntity, (nft) => nft.marketplaceListings)
  nft: NftEntity;
}

