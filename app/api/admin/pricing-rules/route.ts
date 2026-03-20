/**
 * GET  /api/admin/pricing-rules?tourId=X — правила для тура
 * POST /api/admin/pricing-rules           — создать правило
 * DELETE /api/admin/pricing-rules?id=X   — удалить правило
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  operatorTourId:  z.number().int().positive(),
  ruleType:        z.enum(['season_peak','season_low','early_bird','last_minute','occupancy_high','group_discount','weekend']),
  multiplier:      z.number().min(0.5).max(3.0),
  dateFrom:        z.string().optional(),
  dateTo:          z.string().optional(),
  daysBeforeMin:   z.number().int().min(0).optional(),
  daysBeforeMax:   z.number().int().min(0).optional(),
  occupancyMin:    z.number().int().min(1).max(100).optional(),
  guestsMin:       z.number().int().min(1).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const tourId = request.nextUrl.searchParams.get('tourId');

  const { rows } = await pool.query(
    `SELECT pr.*, ot.title AS tour_title, p.company_name AS operator_name
     FROM tour_pricing_rules pr
     JOIN operator_tours ot ON ot.id = pr.operator_tour_id
     JOIN partners p ON p.id = ot.operator_id
     ${tourId ? 'WHERE pr.operator_tour_id = $1' : ''}
     ORDER BY ot.title, pr.rule_type`,
    tourId ? [tourId] : []
  );

  return NextResponse.json({ success: true, data: rows });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO tour_pricing_rules
       (operator_tour_id, rule_type, multiplier,
        date_from, date_to, days_before_min, days_before_max,
        occupancy_min, guests_min)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      d.operatorTourId, d.ruleType, d.multiplier,
      d.dateFrom ?? null, d.dateTo ?? null,
      d.daysBeforeMin ?? null, d.daysBeforeMax ?? null,
      d.occupancyMin ?? null, d.guestsMin ?? null,
    ]
  );

  return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id обязателен' }, { status: 400 });

  await pool.query('DELETE FROM tour_pricing_rules WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
