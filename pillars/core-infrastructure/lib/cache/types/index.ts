/**
 * Cache type definitions and interfaces
 *
 * @module @core-infrastructure/lib/cache/types
 */

/**
 * CacheKey - Valid cache key types
 */
export type CacheKey = string | number;

/**
 * CacheValue - Valid cache value types
 */
export type CacheValue = string | number | boolean | object | null | undefined;

/**
 * CacheOptions - Configuration for cache operations
 *
 * @interface CacheOptions
 * @property {number} [ttl] - Time to live in seconds (optional)
 * @property {boolean} [persistent] - Whether to persist to Redis (optional)
 * @property {string} [tag] - Cache tag for grouping (optional)
 */
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  persistent?: boolean; // Persist to Redis
  tag?: string; // Cache tag for grouping
}

/**
 * CacheConfig - Cache service configuration
 *
 * @interface CacheConfig
 * @property {string} [redisUrl] - Redis connection URL
 * @property {number} [defaultTtl] - Default TTL in seconds
 * @property {number} [maxSize] - Maximum cache size in bytes
 * @property {boolean} [enableStats] - Enable statistics tracking
 */
export interface CacheConfig {
  redisUrl?: string;
  defaultTtl?: number;
  maxSize?: number;
  enableStats?: boolean;
}

/**
 * CacheStats - Cache statistics
 *
 * @interface CacheStats
 * @property {number} hits - Number of cache hits
 * @property {number} misses - Number of cache misses
 * @property {number} sets - Number of cache sets
 * @property {number} deletes - Number of cache deletes
 * @property {number} clears - Number of cache clears
 * @property {number} errors - Number of errors
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  clears: number;
  errors: number;
}

/**
 * CacheEntry - Internal cache entry structure
 *
 * @interface CacheEntry
 * @property {CacheValue} value - Cached value
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} [expiresAt] - Expiration timestamp (if TTL set)
 * @property {number} [ttl] - Original TTL in seconds
 */
export interface CacheEntry {
  value: CacheValue;
  createdAt: Date;
  expiresAt?: Date;
  ttl?: number;
}

/**
 * CacheHitRate - Cache hit rate information
 *
 * @interface CacheHitRate
 * @property {number} hits - Number of hits
 * @property {number} misses - Number of misses
 * @property {number} total - Total requests
 * @property {number} percentage - Hit rate percentage
 */
export interface CacheHitRate {
  hits: number;
  misses: number;
  total: number;
  percentage: number;
}

/**
 * CacheHealthStatus - Cache health check status
 *
 * @interface CacheHealthStatus
 * @property {boolean} healthy - Is cache healthy
 * @property {string} status - Status message
 * @property {number} size - Current cache size
 * @property {Date} checkedAt - Check timestamp
 */
export interface CacheHealthStatus {
  healthy: boolean;
  status: string;
  size: number;
  checkedAt: Date;
}

/**
 * CacheEventType - Cache event types for monitoring
 */
export type CacheEventType = 'set' | 'get' | 'delete' | 'clear' | 'error';

/**
 * CacheEvent - Cache operation event
 *
 * @interface CacheEvent
 * @property {CacheEventType} type - Event type
 * @property {CacheKey} key - Cache key
 * @property {Date} timestamp - Event timestamp
 * @property {number} [duration] - Operation duration in ms
 */
export interface CacheEvent {
  type: CacheEventType;
  key?: CacheKey;
  timestamp: Date;
  duration?: number;
}
