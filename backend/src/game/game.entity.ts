import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PrizeEntity } from '../prize/prize.entity';
import { NftEntity } from '../nft/nft.entity';
import { PlayEntity } from '../play/play.entity';

@Entity('games')
@Index(['isActive', 'createdAt'])
export class GameEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 44, unique: true })
  onChainAddress: string;

  @Column({ type: 'bigint', unique: true })
  gameId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'bigint' })
  costInTokens: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costInUsd: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  totalPlays: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PrizeEntity, (prize) => prize.game)
  prizes: PrizeEntity[];

  @OneToMany(() => NftEntity, (nft) => nft.game)
  nfts: NftEntity[];

  @OneToMany(() => PlayEntity, (play) => play.game)
  plays: PlayEntity[];
}

