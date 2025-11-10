import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Database service for direct PostgreSQL queries
 * Uses TypeORM DataSource for connection pooling and raw SQL queries
 * This is more performant than Supabase REST API for high-frequency writes
 */
@Injectable()
export class DatabaseService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Get the TypeORM DataSource for raw SQL queries
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = any>(sql: string, parameters?: any[]): Promise<T[]> {
    return this.dataSource.query(sql, parameters);
  }

  /**
   * Execute a raw SQL query and return the first result
   */
  async queryOne<T = any>(sql: string, parameters?: any[]): Promise<T | null> {
    const results = await this.dataSource.query(sql, parameters);
    return results[0] || null;
  }

  /**
   * Execute a raw SQL query (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, parameters?: any[]): Promise<any> {
    return this.dataSource.query(sql, parameters);
  }

  /**
   * Start a transaction
   */
  async transaction<T>(
    callback: (manager: any) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(callback);
  }
}


