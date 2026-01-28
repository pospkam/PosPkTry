/**
 * Core Infrastructure - Base Repository
 * Abstract repository pattern for database operations
 */

import { PoolClient } from 'pg';
import { DatabaseService, QueryResult } from '../services/DatabaseService';
import { BaseEntity, QueryOptions, PaginatedResult } from '../types';

/**
 * Abstract base repository for all entities
 */
export abstract class Repository<T extends BaseEntity> {
  protected db: DatabaseService;
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = DatabaseService.getInstance();
  }

  /**
   * Find all records
   */
  async findAll(options?: QueryOptions): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (options?.where) {
      const whereClause = Object.entries(options.where)
        .map(([key], index) => `${key} = $${index + 1}`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(options.where));
    }

    if (options?.orderBy) {
      const orderClause = Object.entries(options.orderBy)
        .map(([key, direction]) => `${key} ${direction.toUpperCase()}`)
        .join(', ');
      query += ` ORDER BY ${orderClause}`;
    }

    if (options?.skip) {
      query += ` OFFSET ${options.skip}`;
    }

    if (options?.take) {
      query += ` LIMIT ${options.take}`;
    }

    const result = await this.db.query<T>(query, params.length > 0 ? params : undefined);
    return result.rows;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<T | null> {
    const result = await this.db.queryOne<T>(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result || null;
  }

  /**
   * Find with pagination
   */
  async findPaginated(
    page: number = 1,
    pageSize: number = 10,
    options?: QueryOptions
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * pageSize;

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    let queryParams: any[] = [];

    if (options?.where) {
      const whereClause = Object.entries(options.where)
        .map(([key], index) => `${key} = $${index + 1}`)
        .join(' AND ');
      countQuery += ` WHERE ${whereClause}`;
      queryParams = Object.values(options.where);
    }

    const countResult = await this.db.query<{ count: number }>(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get paginated data
    const data = await this.findAll({
      ...options,
      skip,
      take: pageSize,
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Create record
   */
  async create(data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.db.queryOne<T>(query, values);
    if (!result) {
      throw new Error('Failed to create record');
    }
    return result;
  }

  /**
   * Update record
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE ${this.primaryKey} = $${keys.length + 1}
      RETURNING *
    `;

    const result = await this.db.queryOne<T>(query, [...values, id]);
    if (!result) {
      throw new Error('Record not found');
    }
    return result;
  }

  /**
   * Delete record
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * Count records
   */
  async count(where?: Record<string, any>): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];

    if (where) {
      const whereClause = Object.entries(where)
        .map(([key], index) => `${key} = $${index + 1}`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(where));
    }

    const result = await this.db.query<{ count: number }>(query, params);
    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Execute raw query
   */
  async execute(query: string, params?: any[]): Promise<QueryResult> {
    return this.db.query(query, params);
  }

  /**
   * Execute raw query for single result
   */
  async executeOne<R = any>(query: string, params?: any[]): Promise<R | null> {
    return this.db.queryOne<R>(query, params);
  }
}

/**
 * User repository
 */
export class UserRepository extends Repository<any> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string) {
    return this.db.queryOne(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
  }

  async findByRole(role: string) {
    return this.findAll({ where: { role } });
  }
}
