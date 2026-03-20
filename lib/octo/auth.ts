/**
 * OCTO API Authentication
 * Bearer token auth via octo_api_keys table
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export interface OctoApiKeyPayload {
  id: string;
  name: string;
  operatorId: string | null;
  canReadProducts: boolean;
  canReadAvailability: boolean;
  canCreateBookings: boolean;
  rateLimitPerMinute: number;
}

function octoError(status: number, error: string, errorMessage: string): NextResponse {
  return NextResponse.json({ error, errorMessage }, { status });
}

/**
 * Validates Bearer token from Authorization header.
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
  }>(
    `SELECT id, name, operator_id, can_read_products, can_read_availability,
            can_create_bookings, rate_limit_per_minute
     FROM octo_api_keys
     WHERE api_key = $1 AND is_active = true`,
    [apiKey]
  );

  if (rows.length === 0) {
    return octoError(401, 'UNAUTHORIZED', 'Invalid or deactivated API key');
  }

  const key = rows[0];

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
  };
}
