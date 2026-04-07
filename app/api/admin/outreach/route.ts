import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = ['found','contacted','replied','registered','declined'] as const;

/**
 * GET /api/admin/outreach - список очереди аутрич
 * PATCH /api/admin/outreach - обновить статус записи
 */
export async function GET(request: NextRequest) {
  const userOrResponse = await requireAdmin(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  const client = await pool.connect();
  try {
    const filterStatus = status !== 'all' && ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number]);

    const [rowsResult, countResult] = await Promise.all([
      client.query(
        `SELECT id, company_name, contact_name, email, phone, website,
                source, source_url, status, outreach_text, notes,
                contacted_at, created_at, updated_at
         FROM outreach_queue
         ${filterStatus ? 'WHERE status = $3' : ''}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        filterStatus ? [limit, offset, status] : [limit, offset]
      ),
      client.query(
        `SELECT COUNT(*)::int AS total FROM outreach_queue ${filterStatus ? 'WHERE status = $1' : ''}`,
        filterStatus ? [status] : []
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        rows: rowsResult.rows,
        total: countResult.rows[0].total,
        offset,
        limit,
      },
    });
  } finally {
    client.release();
  }
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ALLOWED_STATUSES),
  notes: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const userOrResponse = await requireAdmin(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные данные' }, { status: 400 });
  }

  const { id, status, notes } = parsed.data;
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE outreach_queue
       SET status = $2,
           notes = COALESCE($3, notes),
           contacted_at = CASE WHEN $2 = 'contacted' AND contacted_at IS NULL THEN NOW() ELSE contacted_at END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, status`,
      [id, status, notes ?? null]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Запись не найдена' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } finally {
    client.release();
  }
}
