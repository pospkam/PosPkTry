/**
 * PATCH /api/agent/leads/[id]  — обновить статус лида
 * Auth: agent | admin
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  status: z.enum(['contacted', 'qualified', 'converted', 'lost']),
  notes:  z.string().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAgent(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные данные', details: parsed.error.issues }, { status: 400 });
  }

  const result = await query(
    `UPDATE leads SET status = $2, notes = COALESCE($3, notes), updated_at = NOW()
     WHERE id = $1 RETURNING id, status, notes`,
    [params.id, parsed.data.status, parsed.data.notes ?? null]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ success: false, error: 'Лид не найден' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.rows[0] });
}
