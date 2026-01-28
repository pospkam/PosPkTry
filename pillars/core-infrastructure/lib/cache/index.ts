/**
 * Cache module - Public API
 *
 * Exports:
 * - CacheService: Main singleton service class
 * - cache: Default instance
 * - Convenience functions: get, set, deleteKey, clearCache
 * - All type definitions
 *
 * @module @core-infrastructure/lib/cache
 *
 * @example
 * ```typescript
 * import {
 *   cache,
 *   CacheService,
 *   get, set, deleteKey, clearCache,
 *   CacheKey, CacheValue, CacheOptions, CacheStats
 * } from '@core-infrastructure/lib/cache'
 *
 * // Initialize
 * await cache.initialize()
 *
 * // Use convenience functions
 * await set('user:123', userData, { ttl: 3600 })
 * const user = await get('user:123')
 * await deleteKey('user:123')
 * await clearCache()
 *
 * // Or use instance methods
 * await cache.set('key', value, { ttl: 3600 })
 * const value = await cache.get('key')
 * const stats = cache.getStats()
 *
 * // Cleanup
 * await cache.disconnect()
 * ```
 */

// Services
export { CacheService, cache, get, set, deleteKey, clearCache } from './services';

// Types
export type {
  CacheKey,
  CacheValue,
  CacheOptions,
  CacheConfig,
  CacheStats,
  CacheEntry,
  CacheHitRate,
  CacheHealthStatus,
  CacheEventType,
  CacheEvent,
} from './types';
