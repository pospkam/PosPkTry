/**
 * GET /api/admin/leads/list?status=new&limit=10
 * Просмотр лидов для админов и операторов
 * Защита: requireAdmin ИЛИ x-cron-secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  status: z.string().default('new'),
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(req: NextRequest) {
  // Проверка CRON_SECRET или admin JWT
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret');

  const isValidCron = cronSecret && headerSecret === cronSecret && headerSecret.length > 8;

  if (!isValidCron) {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;
  }

  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const { status, limit, offset } = parsed.data;

  try {
    const leads = await query(
      `SELECT
        id, name, email, phone, comment, route_title,
        status, ai_score, proposal_id,
        created_at, updated_at
       FROM leads
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const total = await query(
      `SELECT COUNT(*)::int as count FROM leads WHERE status = $1`,
      [status]
    );

    return NextResponse.json(
      {
        success: true,
        status,
        limit,
        offset,
        total: total.rows[0]?.count ?? 0,
        data: leads.rows,
      },
      { headers: { 'Cache-Control': 'no-cache' } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
