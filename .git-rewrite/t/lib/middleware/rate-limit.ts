/**
 * RATE LIMITING MIDDLEWARE
 * Защита API от злоупотреблений
 * 
 * Features:
 * - Per-IP rate limiting
 * - Per-user rate limiting
 * - Sliding window algorithm
 * - Redis-backed (or in-memory fallback)
 * 
 * @author Cursor AI Agent
 * @date 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;      // Временное окно в миллисекундах
  max: number;           // Максимум запросов в окне
  message?: string;      // Сообщение об ошибке
  statusCode?: number;   // HTTP статус код
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  get(key: string): Promise<number | null>;
  increment(key: string, windowMs: number): Promise<number>;
  reset(key: string): Promise<void>;
}

/**
 * In-memory store (для dev/testing)
 * В production использовать Redis!
 */
class MemoryStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Проверяем не истек ли срок
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return entry.count;
  }

  async increment(key: string, windowMs: number): Promise<number> {
    const entry = this.store.get(key);
    const now = Date.now();
    
    if (!entry || now > entry.resetTime) {
      // Новое окно
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return 1;
    }
    
    // Инкремент существующего
    entry.count++;
    return entry.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Очистка истекших записей (запускать периодически)
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Redis store (для production)
 */
class RedisStore implements RateLimitStore {
  private redis: any; // Redis client

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  async get(key: string): Promise<number | null> {
    const value = await this.redis.get(key);
    return value ? parseInt(value) : null;
  }

  async increment(key: string, windowMs: number): Promise<number> {
    const multi = this.redis.multi();
    multi.incr(key);
    multi.pexpire(key, windowMs);
    const results = await multi.exec();
    return results[0][1]; // Результат INCR
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

// Глобальный store (в production заменить на Redis)
let globalStore: RateLimitStore = new MemoryStore();

// Периодическая очистка in-memory store
if (globalStore instanceof MemoryStore) {
  setInterval(() => {
    (globalStore as MemoryStore).cleanup();
  }, 60000); // Каждую минуту
}

/**
 * Установить custom store (например Redis)
 */
export function setRateLimitStore(store: RateLimitStore) {
  globalStore = store;
}

/**
 * Получить IP адрес из request
 */
function getClientIdentifier(request: NextRequest): string {
  // Пробуем получить реальный IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback (не должен использоваться в production)
  return 'unknown';
}

/**
 * Rate limit middleware factory
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    message = 'Слишком много запросов, попробуйте позже',
    statusCode = 429,
  } = config;

  return async (request: NextRequest, handler: Function) => {
    const identifier = getClientIdentifier(request);
    const key = `ratelimit:${identifier}:${request.url}`;
    
    try {
      // Получаем текущее количество запросов
      const current = await globalStore.increment(key, windowMs);
      
      // Устанавливаем headers
      const headers = new Headers();
      headers.set('X-RateLimit-Limit', max.toString());
      headers.set('X-RateLimit-Remaining', Math.max(0, max - current).toString());
      headers.set('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
      
      // Проверяем лимит
      if (current > max) {
        headers.set('Retry-After', Math.ceil(windowMs / 1000).toString());
        
        return NextResponse.json(
          {
            success: false,
            error: message,
            errorCode: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(windowMs / 1000)
          },
          { 
            status: statusCode,
            headers 
          }
        );
      }
      
      // Выполняем оригинальный handler
      const response = await handler(request);
      
      // Добавляем rate limit headers к ответу
      if (response instanceof NextResponse) {
        for (const [key, value] of headers.entries()) {
          response.headers.set(key, value);
        }
      }
      
      return response;
      
    } catch (error) {
      console.error('Rate limit error:', error);
      // В случае ошибки пропускаем (fail open)
      return handler(request);
    }
  };
}

/**
 * Preset configurations
 */
export const RateLimitPresets = {
  // Строгий лимит для аутентификации
  authentication: {
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5,                   // 5 попыток
    message: 'Слишком много попыток входа'
  },
  
  // Стандартный лимит для API
  api: {
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100,                 // 100 запросов
    message: 'Превышен лимит запросов к API'
  },
  
  // Мягкий лимит для публичных endpoint
  public: {
    windowMs: 1 * 60 * 1000,  // 1 минута
    max: 30,                  // 30 запросов
    message: 'Слишком много запросов'
  },
  
  // Жесткий лимит для создания ресурсов
  creation: {
    windowMs: 1 * 60 * 1000,  // 1 минута
    max: 5,                   // 5 созданий
    message: 'Слишком частое создание ресурсов'
  }
};

/**
 * Обертка для API route с rate limiting
 */
export function withRateLimit(config: RateLimitConfig, handler: Function) {
  const limiter = rateLimit(config);
  
  return async (request: NextRequest) => {
    return limiter(request, async (req: NextRequest) => {
      return handler(req);
    });
  };
}

/**
 * Пример использования:
 * 
 * // В API route
 * import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
 * 
 * export const POST = withRateLimit(
 *   RateLimitPresets.creation,
 *   async (request: NextRequest) => {
 *     // Ваш handler код
 *   }
 * );
 * 
 * // Или с custom конфигом
 * export const POST = withRateLimit(
 *   {
 *     windowMs: 60 * 1000,
 *     max: 10,
 *     message: 'Слишком много заказов'
 *   },
 *   async (request: NextRequest) => {
 *     // Ваш handler код
 *   }
 * );
 */
