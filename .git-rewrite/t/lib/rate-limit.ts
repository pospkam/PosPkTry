/**
 * In-memory rate limiter for API routes.
 * Works per Node.js process — sufficient for single-instance Timeweb deployment.
 * Falls back gracefully: if checking fails, request is allowed through.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   const allowed = limiter.check(ip);
 *   if (!allowed) return apiError('Слишком много запросов', 429);
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Window size in milliseconds */
  windowMs: number;
  /** Max requests per window per key */
  max: number;
}

export interface RateLimiter {
  /** Returns true if the request is allowed, false if rate-limited */
  check(key: string): boolean;
}

export function createRateLimiter({ windowMs, max }: RateLimiterOptions): RateLimiter {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup entries older than 2× the window to prevent unbounded growth.
  // Called inline — no setInterval needed (Edge/serverless friendly).
  function cleanup(): void {
    const cutoff = Date.now() - windowMs * 2;
    for (const [k, entry] of store.entries()) {
      if (entry.resetAt < cutoff) store.delete(k);
    }
  }

  return {
    check(key: string): boolean {
      cleanup();
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (entry.count >= max) {
        return false;
      }

      entry.count += 1;
      return true;
    },
  };
}

/** Extract client IP from NextRequest headers */
export function getClientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
}
