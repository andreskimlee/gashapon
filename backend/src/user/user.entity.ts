import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Optional User Entity
 * 
 * This table is NOT required for core functionality.
 * Users are identified by wallet addresses across all tables.
 * 
 * Use this table if you want to:
 * - Cache user statistics for performance
 * - Store user preferences/settings
 * - Track last seen/activity
 * - Store on-chain profile data (e.g., from SNS domains)
 * 
 * If you don't need these features, you can delete this entity.
 */
@Entity('users')
@Index(['wallet'])
export class UserEntity {
  @Column({ type: 'varchar', length: 44, primary: true })
  wallet: string; // Solana wallet address (base58)

  // Optional: On-chain profile data
  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  snsDomain: string | null; // e.g., "user.sol"

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null; // Profile picture URL

  // Cached statistics (updated periodically, not real-time)
  @Column({ type: 'int', default: 0 })
  cachedTotalPlays: number;

  @Column({ type: 'int', default: 0 })
  cachedTotalWins: number;

  @Column({ type: 'int', default: 0 })
  cachedNftsOwned: number;

  // User preferences (optional)
  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any> | null;

  // Activity tracking
  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

