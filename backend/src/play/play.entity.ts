import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { GameEntity } from '../game/game.entity';
import { PrizeEntity } from '../prize/prize.entity';

export enum PlayStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('plays')
@Index(['userWallet', 'playedAt'])
@Index(['gameId', 'playedAt'])
export class PlayEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  gameId: number;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  userWallet: string;

  @Column({ type: 'int', nullable: true })
  prizeId: number | null;

  @Column({ type: 'varchar', length: 44, nullable: true })
  @Index()
  nftMint: string | null;

  @Column({ type: 'varchar', length: 88, unique: true })
  @Index()
  transactionSignature: string;

  @Column({ type: 'bytea', nullable: true })
  randomValue: Buffer | null;

  @Column({ type: 'bigint', nullable: true })
  tokenAmountPaid: number | null;

  @Column({
    type: 'enum',
    enum: PlayStatus,
    default: PlayStatus.PENDING,
  })
  status: PlayStatus;

  @CreateDateColumn()
  @Index()
  playedAt: Date;

  @ManyToOne(() => GameEntity, (game) => game.plays)
  game: GameEntity;

  @ManyToOne(() => PrizeEntity, (prize) => prize.plays)
  prize: PrizeEntity | null;
}

