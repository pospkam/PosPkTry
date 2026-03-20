/**
 * PATCH  /api/admin/octo-keys/[id] — update OCTO API key settings
 * DELETE /api/admin/octo-keys/[id] — deactivate OCTO API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { UpdateApiKeySchema } from '@/lib/octo/schemas';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Некорректный JSON' },
      { status: 400 }
    );
  }

  const parsed = UpdateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); values.push(data.name); }
  if (data.isActive !== undefined) { sets.push(`is_active = $${idx++}`); values.push(data.isActive); }
  if (data.canReadProducts !== undefined) { sets.push(`can_read_products = $${idx++}`); values.push(data.canReadProducts); }
  if (data.canReadAvailability !== undefined) { sets.push(`can_read_availability = $${idx++}`); values.push(data.canReadAvailability); }
  if (data.canCreateBookings !== undefined) { sets.push(`can_create_bookings = $${idx++}`); values.push(data.canCreateBookings); }
  if (data.rateLimitPerMinute !== undefined) { sets.push(`rate_limit_per_minute = $${idx++}`); values.push(data.rateLimitPerMinute); }
  if (data.notes !== undefined) { sets.push(`notes = $${idx++}`); values.push(data.notes); }

  // webhook fields (not in schema — accept directly from body)
  const rawBody = body as Record<string, unknown>;
  if (rawBody.webhookUrl    !== undefined) { sets.push(`webhook_url = $${idx++}`);    values.push(rawBody.webhookUrl    ?? null); }
  if (rawBody.webhookSecret !== undefined) { sets.push(`webhook_secret = $${idx++}`); values.push(rawBody.webhookSecret ?? null); }

  if (sets.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Нечего обновлять' },
      { status: 400 }
    );
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE octo_api_keys SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, name, is_active`,
    values
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Ключ не найден' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: rows[0] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const { rows } = await pool.query(
    `UPDATE octo_api_keys SET is_active = false WHERE id = $1 RETURNING id, name`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Ключ не найден' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: rows[0] });
}
