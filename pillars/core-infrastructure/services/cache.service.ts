import Redis from 'ioredis'

/**
 * CacheService - Управление кешем через Redis
 */
export class CacheService {
  private static instance: CacheService
  private redis: Redis

  private constructor() {
    this.redis = new Redis({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    })
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Cache get error', { key, error })
      return null
    }
  }

  async set<T = any>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      if (ttl) {
        await this.redis.setex(key, ttl, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
      return true
    } catch (error) {
      console.error('Cache set error', { key, error })
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.redis.del(key)
      return true
    } catch (error) {
      console.error('Cache delete error', { key, error })
      return false
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length === 0) return 0
      return await this.redis.del(...keys)
    } catch (error) {
      console.error('Cache delete pattern error', { pattern, error })
      return 0
    }
  }

  async close() {
    await this.redis.quit()
  }
}

export const cacheService = CacheService.getInstance()
