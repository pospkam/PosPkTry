/**
 * Core Infrastructure - Database Service
 * Central database connection and query management
 * 
 * Handles:
 * - Connection pooling to PostgreSQL
 * - Query execution with type safety
 * - Transaction management
 * - Connection lifecycle
 */

import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg';
import { config } from '@/lib/config';

/**
 * Database query result wrapper
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

/**
 * Database connection pool configuration
 */
interface PoolConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | any;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Core Database Service Singleton
 * Manages all database operations for the application
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private pool: Pool | null = null;
  private isConnected = false;

  private constructor() {}

  /**
   * Get DatabaseService singleton instance
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    if (this.isConnected && this.pool) {
      console.log('ℹ️ Database already initialized');
      return;
    }

    try {
      const poolConfig: PoolConfig = {
        connectionString: config.database.url,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      if (config.database.ssl) {
        poolConfig.ssl = { rejectUnauthorized: false };
      }

      this.pool = new Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.log('✅ Database initialized successfully');
      console.log(`   Host: ${config.database.host}`);
      console.log(`   Database: ${config.database.name}`);
      console.log(`   Pool size: 20 connections`);
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get raw pool for advanced operations
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  /**
   * Get a single client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.pool.connect();
  }

  /**
   * Execute a query
   */
  async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      const result: PgQueryResult<T> = await this.pool.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command,
      };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Execute a query with single row result
   */
  async queryOne<T = any>(
    text: string,
    params?: any[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Start transaction
   */
  async beginTransaction(): Promise<PoolClient> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      return client;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  /**
   * Commit transaction
   */
  async commitTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  /**
   * Execute transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.beginTransaction();
    try {
      const result = await callback(client);
      await this.commitTransaction(client);
      return result;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    timestamp: Date;
  }> {
    try {
      await this.query('SELECT 1');
      return {
        status: 'healthy',
        message: 'Database connection OK',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
        console.log('✅ Database disconnected');
      } catch (error) {
        console.error('Error disconnecting from database:', error);
      }
    }
  }

  /**
   * Check if connected
   */
  isInitialized(): boolean {
    return this.isConnected && this.pool !== null;
  }
}

/**
 * Singleton instance export
 */
export const database = DatabaseService.getInstance();

/**
 * Convenience function for queries
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const db = DatabaseService.getInstance();
  return db.query<T>(text, params);
}

/**
 * Convenience function for single row queries
 */
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const db = DatabaseService.getInstance();
  return db.queryOne<T>(text, params);
}
