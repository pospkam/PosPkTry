/**
 * OCTO API Authentication + Rate limiting
 * Bearer token auth via octo_api_keys table.
 * Per-key in-memory rate limiter (rateLimitPerMinute from DB).
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { createRateLimiter, RateLimiter } from '@/lib/rate-limit';

export interface OctoApiKeyPayload {
  id: string;
  name: string;
  operatorId: string | null;
  canReadProducts: boolean;
  canReadAvailability: boolean;
  canCreateBookings: boolean;
  rateLimitPerMinute: number;
  webhookUrl: string | null;
  // Rate limit headers for OCTO standard compliance
  rateLimitRemaining: number;
  rateLimitReset: number;
}

export function octoError(status: number, error: string, errorMessage: string): NextResponse {
  return NextResponse.json({ error, errorMessage }, { status });
}

/**
 * Apply OCTO-standard rate limit headers to a response.
 * Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */
export function applyOctoRateLimitHeaders(
  response: NextResponse,
  authPayload: OctoApiKeyPayload
): NextResponse {
  response.headers.set('X-RateLimit-Limit', authPayload.rateLimitPerMinute.toString());
  response.headers.set('X-RateLimit-Remaining', authPayload.rateLimitRemaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(authPayload.rateLimitReset / 1000).toString());
  return response;
}

// Per-key rate limiters: keyId → limiter instance
// Limiters are created lazily and keyed by "{keyId}:{rateLimit}"
// so that a changed rateLimit auto-creates a fresh limiter.
const limiters = new Map<string, RateLimiter>();

function getLimiter(keyId: string, ratePerMinute: number): RateLimiter {
  const cacheKey = `${keyId}:${ratePerMinute}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = createRateLimiter({ windowMs: 60_000, max: ratePerMinute });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Validates Bearer token, enforces per-key rate limit.
 * Returns OctoApiKeyPayload or NextResponse (error).
 */
export async function requireOctoAuth(
  request: NextRequest
): Promise<OctoApiKeyPayload | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return octoError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header. Use: Bearer <api_key>');
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return octoError(401, 'UNAUTHORIZED', 'Empty API key');
  }

  const { rows } = await pool.query<{
    id: string;
    name: string;
    operator_id: string | null;
    can_read_products: boolean;
    can_read_availability: boolean;
    can_create_bookings: boolean;
    rate_limit_per_minute: number;
    webhook_url: string | null;
  }>(
    `SELECT id, name, operator_id, can_read_products, can_read_availability,
            can_create_bookings, rate_limit_per_minute, webhook_url
     FROM octo_api_keys
     WHERE api_key = $1 AND is_active = true`,
    [apiKey]
  );

  if (rows.length === 0) {
    return octoError(401, 'UNAUTHORIZED', 'Invalid or deactivated API key');
  }

  const key = rows[0];

  // Rate limiting: per API key, per minute
  const limiter = getLimiter(key.id, key.rate_limit_per_minute);
  const status = limiter.getStatus(key.id, key.rate_limit_per_minute);

  if (!limiter.check(key.id)) {
    return octoError(
      429,
      'RATE_LIMIT_EXCEEDED',
      `Too many requests. Limit: ${key.rate_limit_per_minute} requests/minute`
    );
  }

  // Update last_used_at (fire and forget)
  pool.query('UPDATE octo_api_keys SET last_used_at = NOW() WHERE id = $1', [key.id]).catch(() => {});

  return {
    id: key.id,
    name: key.name,
    operatorId: key.operator_id,
    canReadProducts: key.can_read_products,
    canReadAvailability: key.can_read_availability,
    canCreateBookings: key.can_create_bookings,
    rateLimitPerMinute: key.rate_limit_per_minute,
    webhookUrl: key.webhook_url,
    rateLimitRemaining: status.remaining,
    rateLimitReset: status.resetAt,
  };
}
