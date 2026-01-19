import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { PrizeEntity } from '../prize/prize.entity';

export enum RedemptionStatus {
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

@Entity('redemptions')
@Index(['userWallet', 'redeemedAt'])
@Index(['status', 'redeemedAt'])
@Index(['dataDeletionScheduledAt'])
export class RedemptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 44, unique: true })
  @Index()
  nftMint: string;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  userWallet: string;

  @Column({ type: 'int' })
  prizeId: number;

  @Column({ type: 'varchar', length: 50 })
  shipmentProvider: string; // 'shipstation', 'easypost', etc.

  @Column({ type: 'varchar', length: 100 })
  @Index()
  shipmentId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  carrier: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  carrierCode: string | null;

  @Column({ type: 'text', nullable: true })
  labelPdfUrl: string | null;

  @Column({ type: 'text', nullable: true })
  labelPngUrl: string | null;

  @Column({ type: 'text', nullable: true })
  trackingUrl: string | null;

  @Column({
    type: 'enum',
    enum: RedemptionStatus,
    default: RedemptionStatus.PROCESSING,
  })
  @Index()
  status: RedemptionStatus;

  @Column({ type: 'date', nullable: true })
  estimatedDelivery: Date | null;

  @CreateDateColumn()
  @Index()
  redeemedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  shippedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  dataDeletionScheduledAt: Date | null;

  @ManyToOne(() => PrizeEntity)
  prize: PrizeEntity;
}

