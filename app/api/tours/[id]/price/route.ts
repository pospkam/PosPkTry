/**
 * GET /api/tours/[id]/price?date=YYYY-MM-DD&guests=2&ref=CODE
 *
 * Возвращает динамическую цену тура на указанную дату.
 * Если передан ref= (агентский код) — фиксирует клик.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { calculateDynamicPrice } from '@/lib/services/dynamic-pricing';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
  guests: z.coerce.number().min(1).max(50).default(1),
  ref:    z.string().max(32).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sp = request.nextUrl.searchParams;

  const parsed = QuerySchema.safeParse({
    date:   sp.get('date'),
    guests: sp.get('guests'),
    ref:    sp.get('ref') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { date, guests, ref } = parsed.data;

  // Получаем базовую цену тура
  const { rows } = await pool.query<{ base_price: string; title: string }>(
    `SELECT base_price, title FROM operator_tours
     WHERE id = $1 AND is_published = TRUE AND deleted_at IS NULL`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Тур не найден' }, { status: 404 });
  }

  const basePrice = parseFloat(rows[0].base_price);

  // Рассчитываем динамическую цену
  const priceResult = await calculateDynamicPrice({
    tourId:    id,
    tourDate:  date,
    guests,
    basePrice,
  });

  // Фиксируем клик по реф. ссылке (fire-and-forget)
  if (ref) {
    pool.query(
      `UPDATE agent_referral_links SET clicks = clicks + 1
       WHERE code = $1 AND is_active = TRUE`,
      [ref]
    ).then(async (r) => {
      if (r.rowCount && r.rowCount > 0) {
        // Записываем событие
        const linkRes = await pool.query(
          `SELECT id FROM agent_referral_links WHERE code = $1`,
          [ref]
        );
        if (linkRes.rows[0]) {
          await pool.query(
            `INSERT INTO agent_referral_events (link_id, event_type, ip)
             VALUES ($1, 'click', $2)`,
            [linkRes.rows[0].id, request.headers.get('x-forwarded-for')?.split(',')[0] ?? null]
          );
        }
      }
    }).catch(() => {});
  }

  return NextResponse.json({
    success:      true,
    tourId:       id,
    tourTitle:    rows[0].title,
    date,
    guests,
    basePrice:    priceResult.basePrice,
    finalPrice:   priceResult.finalPrice,
    discount:     priceResult.discount,
    multiplier:   priceResult.multiplier,
    appliedRules: priceResult.appliedRules,
  });
}
