import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { GameEntity } from '../game/game.entity';
import { NftEntity } from '../nft/nft.entity';
import { PlayEntity } from '../play/play.entity';

@Entity('prizes')
@Index(['gameId', 'tier'])
@Unique(['gameId', 'prizeId']) // Required for ON CONFLICT upsert
export class PrizeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  gameId: number;

  @Column({ type: 'bigint' })
  prizeId: number;

  @Column({ type: 'smallint', default: 0 })
  @Index()
  prizeIndex: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  physicalSku: string;

  @Column({ type: 'varchar', length: 20 })
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';

  @Column({ type: 'int' })
  probabilityBasisPoints: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costInUsd: number | null;

  @Column({ type: 'int', nullable: true })
  weightGrams: number | null;

  // Package dimensions for shipping (in inches)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  lengthInches: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  widthInches: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heightInches: number | null;

  @Column({ type: 'int' })
  supplyTotal: number;

  @Column({ type: 'int' })
  @Index()
  supplyRemaining: number;

  @Column({ type: 'text', nullable: true })
  metadataUri: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => GameEntity, (game) => game.prizes)
  game: GameEntity;

  @OneToMany(() => NftEntity, (nft) => nft.prize)
  nfts: NftEntity[];

  @OneToMany(() => PlayEntity, (play) => play.prize)
  plays: PlayEntity[];
}

