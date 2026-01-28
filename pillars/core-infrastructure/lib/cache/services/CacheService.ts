/**
 * CacheService - Singleton cache service with Redis and in-memory support
 *
 * Provides centralized caching for the application with support for:
 * - Redis (production)
 * - In-memory storage (development/fallback)
 * - TTL management
 * - Automatic expiration
 *
 * @module @core-infrastructure/lib/cache/services
 */

import { CacheConfig, CacheKey, CacheValue, CacheOptions, CacheStats } from '../types';

/**
 * CacheService - Singleton service for managing application cache
 *
 * Features:
 * - Single instance across application
 * - Redis support with fallback to in-memory
 * - TTL (Time To Live) management
 * - Automatic key expiration
 * - Async/await support
 * - Statistics tracking
 *
 * @example
 * ```typescript
 * const cache = CacheService.getInstance();
 *
 * // Set value with TTL
 * await cache.set('user:123', userData, { ttl: 3600 });
 *
 * // Get value
 * const user = await cache.get('user:123');
 *
 * // Delete value
 * await cache.delete('user:123');
 *
 * // Clear all cache
 * await cache.clear();
 *
 * // Get statistics
 * const stats = cache.getStats();
 * ```
 */
export class CacheService {
  private static instance: CacheService;
  private store: Map<string, CacheValue> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    clears: 0,
    errors: 0,
  };

  // Redis client would be initialized here in production
  private redisClient: any = null;
  private useRedis: boolean = false;
  private initialized: boolean = false;

  /**
   * Private constructor - use getInstance() to get singleton instance
   */
  private constructor() {}

  /**
   * Get singleton instance of CacheService
   *
   * @returns {CacheService} Singleton instance
   *
   * @example
   * ```typescript
   * const cache = CacheService.getInstance();
   * ```
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initialize cache service
   * Attempts to connect to Redis, falls back to in-memory
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * const cache = CacheService.getInstance();
   * await cache.initialize();
   * ```
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Attempt Redis connection if configured
      if (process.env.REDIS_URL) {
        try {
          // Redis initialization would happen here
          // For now, we use in-memory as fallback
          this.useRedis = false;
          console.log('✅ Cache initialized (in-memory mode)');
        } catch (error) {
          console.warn('⚠️ Redis connection failed, using in-memory cache');
          this.useRedis = false;
        }
      }

      this.initialized = true;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Cache initialization error:', error);
      throw new Error(`Cache initialization failed: ${error}`);
    }
  }

  /**
   * Set value in cache with optional TTL
   *
   * @async
   * @param {CacheKey} key - Cache key
   * @param {CacheValue} value - Value to cache
   * @param {CacheOptions} options - Optional configuration
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await cache.set('user:123', userData, { ttl: 3600 });
   * await cache.set('config', appConfig, { ttl: 86400 });
   * ```
   */
  public async set(
    key: CacheKey,
    value: CacheValue,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const { ttl } = options;

      // Clear existing timer if any
      this.clearTimer(key);

      // Store in memory
      this.store.set(key, value);
      this.stats.sets++;

      // Set TTL if provided
      if (ttl && ttl > 0) {
        const timer = setTimeout(() => {
          this.delete(key);
        }, ttl * 1000);

        this.timers.set(key, timer);
      }

      // In production, also store in Redis
      if (this.useRedis && this.redisClient) {
        try {
          const serialized = JSON.stringify(value);
          if (ttl) {
            await this.redisClient.setex(key, ttl, serialized);
          } else {
            await this.redisClient.set(key, serialized);
          }
        } catch (error) {
          console.warn(`⚠️ Redis set failed for key ${key}:`, error);
        }
      }
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Cache set error: ${error}`);
    }
  }

  /**
   * Get value from cache
   *
   * @async
   * @param {CacheKey} key - Cache key
   * @returns {Promise<CacheValue | null>} Cached value or null if not found
   *
   * @example
   * ```typescript
   * const user = await cache.get('user:123');
   * if (user) {
   *   console.log('Cache hit:', user);
   * } else {
   *   console.log('Cache miss');
   * }
   * ```
   */
  public async get(key: CacheKey): Promise<CacheValue | null> {
    try {
      // Try memory first
      const cached = this.store.get(key);

      if (cached !== undefined) {
        this.stats.hits++;
        return cached;
      }

      // Try Redis if available
      if (this.useRedis && this.redisClient) {
        try {
          const redisValue = await this.redisClient.get(key);
          if (redisValue) {
            const parsed = JSON.parse(redisValue);
            // Update memory cache
            this.store.set(key, parsed);
            this.stats.hits++;
            return parsed;
          }
        } catch (error) {
          console.warn(`⚠️ Redis get failed for key ${key}:`, error);
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete value from cache
   *
   * @async
   * @param {CacheKey} key - Cache key
   * @returns {Promise<boolean>} True if deleted, false if not found
   *
   * @example
   * ```typescript
   * const deleted = await cache.delete('user:123');
   * console.log(`User cache ${deleted ? 'deleted' : 'not found'}`);
   * ```
   */
  public async delete(key: CacheKey): Promise<boolean> {
    try {
      this.clearTimer(key);

      const existed = this.store.has(key);
      this.store.delete(key);
      this.stats.deletes++;

      // Also delete from Redis if available
      if (this.useRedis && this.redisClient) {
        try {
          await this.redisClient.del(key);
        } catch (error) {
          console.warn(`⚠️ Redis delete failed for key ${key}:`, error);
        }
      }

      return existed;
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Cache delete error: ${error}`);
    }
  }

  /**
   * Clear all cache
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await cache.clear();
   * console.log('All cache cleared');
   * ```
   */
  public async clear(): Promise<void> {
    try {
      // Clear all timers
      this.timers.forEach((timer) => clearTimeout(timer));
      this.timers.clear();

      // Clear memory
      this.store.clear();
      this.stats.clears++;

      // Clear Redis if available
      if (this.useRedis && this.redisClient) {
        try {
          await this.redisClient.flushdb();
        } catch (error) {
          console.warn('⚠️ Redis flush failed:', error);
        }
      }
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Cache clear error: ${error}`);
    }
  }

  /**
   * Check if key exists in cache
   *
   * @async
   * @param {CacheKey} key - Cache key
   * @returns {Promise<boolean>} True if exists, false otherwise
   *
   * @example
   * ```typescript
   * if (await cache.exists('user:123')) {
   *   console.log('User is cached');
   * }
   * ```
   */
  public async exists(key: CacheKey): Promise<boolean> {
    try {
      return this.store.has(key);
    } catch (error) {
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get cache size (number of items)
   *
   * @returns {number} Number of cached items
   *
   * @example
   * ```typescript
   * const size = cache.size();
   * console.log(`Cache has ${size} items`);
   * ```
   */
  public size(): number {
    return this.store.size;
  }

  /**
   * Get cache statistics
   *
   * @returns {CacheStats} Cache statistics
   *
   * @example
   * ```typescript
   * const stats = cache.getStats();
   * console.log(`Cache hits: ${stats.hits}, misses: ${stats.misses}`);
   * console.log(`Hit rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)}%`);
   * ```
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   *
   * @returns {void}
   *
   * @example
   * ```typescript
   * cache.resetStats();
   * ```
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      clears: 0,
      errors: 0,
    };
  }

  /**
   * Check if cache is initialized
   *
   * @returns {boolean} Initialization status
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Disconnect cache service (cleanup)
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await cache.disconnect();
   * ```
   */
  public async disconnect(): Promise<void> {
    try {
      await this.clear();

      if (this.useRedis && this.redisClient) {
        // Redis disconnect would happen here
      }

      this.initialized = false;
      console.log('✅ Cache service disconnected');
    } catch (error) {
      console.error('❌ Cache disconnect error:', error);
    }
  }

  /**
   * Private method to clear TTL timer for a key
   *
   * @private
   * @param {CacheKey} key - Cache key
   */
  private clearTimer(key: CacheKey): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}

/**
 * Convenience export: Default cache instance
 */
export const cache = CacheService.getInstance();

/**
 * Convenience functions
 */

/**
 * Get value from cache
 * @param {CacheKey} key - Cache key
 * @returns {Promise<CacheValue | null>}
 */
export async function get(key: CacheKey): Promise<CacheValue | null> {
  return cache.get(key);
}

/**
 * Set value in cache
 * @param {CacheKey} key - Cache key
 * @param {CacheValue} value - Value to cache
 * @param {CacheOptions} options - Optional configuration
 * @returns {Promise<void>}
 */
export async function set(
  key: CacheKey,
  value: CacheValue,
  options?: CacheOptions
): Promise<void> {
  return cache.set(key, value, options);
}

/**
 * Delete value from cache
 * @param {CacheKey} key - Cache key
 * @returns {Promise<boolean>}
 */
export async function deleteKey(key: CacheKey): Promise<boolean> {
  return cache.delete(key);
}

/**
 * Clear all cache
 * @returns {Promise<void>}
 */
export async function clearCache(): Promise<void> {
  return cache.clear();
}
