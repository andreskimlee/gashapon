import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PrizeEntity } from '../prize/prize.entity';
import { GameEntity } from '../game/game.entity';
import { MarketplaceListingEntity } from '../marketplace/marketplace-listing.entity';

@Entity('nfts')
@Index(['currentOwner', 'isRedeemed'])
@Index(['isRedeemed', 'mintAddress'])
export class NftEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 44, unique: true })
  @Index()
  mintAddress: string;

  @Column({ type: 'int' })
  @Index()
  prizeId: number;

  @Column({ type: 'int' })
  @Index()
  gameId: number;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  currentOwner: string;

  @Column({ type: 'boolean', default: false })
  @Index()
  isRedeemed: boolean;

  @Column({ type: 'varchar', length: 88, nullable: true })
  redemptionTx: string | null;

  @CreateDateColumn()
  mintedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date | null;

  @ManyToOne(() => PrizeEntity, (prize) => prize.nfts)
  prize: PrizeEntity;

  @ManyToOne(() => GameEntity, (game) => game.nfts)
  game: GameEntity;

  @OneToMany(() => MarketplaceListingEntity, (listing) => listing.nft)
  marketplaceListings: MarketplaceListingEntity[];
}

