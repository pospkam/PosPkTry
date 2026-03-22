/**
 * GET  /api/admin/octo-keys — list all OCTO API keys
 * POST /api/admin/octo-keys — create new OCTO API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { CreateApiKeySchema } from '@/lib/octo/schemas';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * SECURITY: Mask sensitive API key before returning in response
 * Shows only first 4 and last 4 characters to prevent leakage
 */
function maskApiKey(fullKey: string): string {
  if (!fullKey || fullKey.length < 8) return '****';
  return `${fullKey.substring(0, 4)}${'*'.repeat(fullKey.length - 8)}${fullKey.substring(fullKey.length - 4)}`;
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { rows } = await pool.query(
    `SELECT k.id, k.name, k.api_key, k.operator_id, k.can_read_products,
            k.can_read_availability, k.can_create_bookings, k.rate_limit_per_minute,
            k.is_active, k.last_used_at, k.created_at, k.notes,
            p.company_name AS operator_name
     FROM octo_api_keys k
     LEFT JOIN partners p ON p.id = k.operator_id
     ORDER BY k.created_at DESC`
  );

  // SECURITY: Mask API keys before returning
  const maskedRows = rows.map((row: Record<string, unknown>) => ({
    ...row,
    api_key: maskApiKey(row.api_key as string),
  }));

  return NextResponse.json({ success: true, data: maskedRows });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Некорректный JSON' },
      { status: 400 }
    );
  }

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const apiKey = randomBytes(32).toString('hex');

  const webhookUrl    = (body as Record<string, unknown>)['webhookUrl']    as string | undefined;
  const webhookSecret = (body as Record<string, unknown>)['webhookSecret'] as string | undefined;

  const { rows } = await pool.query(
    `INSERT INTO octo_api_keys (
       name, api_key, operator_id, can_read_products, can_read_availability,
       can_create_bookings, rate_limit_per_minute, created_by, notes,
       webhook_url, webhook_secret
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, name, api_key, operator_id, is_active, created_at`,
    [
      data.name, apiKey, data.operatorId ?? null,
      data.canReadProducts, data.canReadAvailability, data.canCreateBookings,
      data.rateLimitPerMinute, user.userId, data.notes ?? null,
      webhookUrl ?? null, webhookSecret ?? null,
    ]
  );

  // SECURITY: Return masked API key to admin (full key was only visible at creation time in logs)
  const maskedData = {
    ...rows[0],
    api_key: maskApiKey(rows[0]?.api_key as string),
  };

  return NextResponse.json({ success: true, data: maskedData }, { status: 201 });
}
