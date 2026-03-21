/**
 * GET  /api/agent/leads  — входящие лиды платформы для агента
 * Auth: agent | admin
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'all']).default('all'),
  limit:  z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  q:      z.string().max(100).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAgent(req);
  if (auth instanceof NextResponse) return auth;

  const sp = new URL(req.url).searchParams;
  const parsed = QuerySchema.safeParse({
    status: sp.get('status') ?? undefined,
    limit:  sp.get('limit')  ?? undefined,
    offset: sp.get('offset') ?? undefined,
    q:      sp.get('q')      ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные параметры' }, { status: 400 });
  }

  const { status, limit, offset, q } = parsed.data;
  const params: unknown[] = [];
  const where: string[] = ["l.status IN ('new','contacted','qualified')"];

  if (status !== 'all') {
    params.push(status);
    where.push(`l.status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(l.name ILIKE $${params.length} OR l.phone ILIKE $${params.length})`);
  }

  params.push(limit, offset);

  const sql = `
    SELECT
      l.id, l.name, l.phone, l.comment,
      l.route_title, l.source_url,
      l.source_data,
      l.status, l.notes,
      l.created_at, l.updated_at
    FROM leads l
    WHERE ${where.join(' AND ')}
    ORDER BY l.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const countSql = `
    SELECT COUNT(*) as total FROM leads l
    WHERE ${where.join(' AND ')}
  `;

  const [rows, cnt] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, params.length - 2)),
  ]);

  return NextResponse.json({
    success: true,
    data: rows.rows,
    meta: {
      total: parseInt((cnt.rows[0] as { total: string }).total),
      limit,
      offset,
    },
  });
}
