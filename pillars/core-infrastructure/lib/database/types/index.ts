/**
 * Core Infrastructure - Database Types
 * Shared types and interfaces for database entities
 */

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User entity
 */
export interface User extends BaseEntity {
  email: string;
  name: string;
  password_hash?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  preferences?: Record<string, any>;
  lastLoginAt?: Date;
}

/**
 * User roles
 */
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  AGENT = 'agent',
  GUIDE = 'guide',
  TOURIST = 'tourist',
  TRANSFER = 'transfer',
}

/**
 * Query options
 */
export interface QueryOptions {
  skip?: number;
  take?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
  where?: Record<string, any>;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Database connection info
 */
export interface ConnectionInfo {
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
}

/**
 * Transaction context
 */
export interface TransactionContext {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

/**
 * Database health status
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: Date;
  responseTime?: number;
}

/**
 * Query result wrapper
 */
export interface DatabaseResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

/**
 * Error response
 */
export interface DatabaseError {
  code: string;
  message: string;
  detail?: string;
  hint?: string;
  context?: string;
}
