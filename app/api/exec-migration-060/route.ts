/**
 * GET /api/exec-migration-060
 * Execute migration 060 - create rafting tour
 * TEMPORARY - no auth required
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create partner
    await pool.query(
      `INSERT INTO partners (slug, name, contacts, location, is_public, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [
        'kamchatka-rafting',
        'Камчатка Рафтинг',
        JSON.stringify({
          phone: '+79247990191',
          admin_name: 'Катерина',
          admin_name_2: 'Ярослав',
          telegram_channel: 'https://t.me/+GCy5EVOotCE1NDMy'
        }),
        JSON.stringify({
          city: 'Петропавловск-Камчатский',
          region: 'Камчатский край'
        }),
        true
      ]
    );

    // Create tour for the partner
    await pool.query(
      `WITH partner AS (
         SELECT id FROM partners WHERE slug = 'kamchatka-rafting'
       )
       INSERT INTO operator_tours (
         id, operator_id, title, description, activity_type, location_type,
         base_price, price_unit, location_name, max_participants,
         is_published, created_at
       )
       SELECT
         gen_random_uuid(),
         p.id,
         $1, $2, $3, $4, $5, $6, $7, $8, false, NOW()
       FROM partner p`,
      [
        'Однодневная экскурсия СПЛАВ ПО РЕКЕ БЫСТРАЯ',
        `Захватывающий сплав по реке Быстрая с остановкой на Малкинских горячих источниках.

В программе:
✓ Выезд из Петропавловск-Камчатский (Паратунская зона отдыха)
✓ п. Сокочи (пирожковый перекус)
✓ Инструктаж на реке Быстрая, получение снаряжения
✓ Сплав с гидом
✓ Обед: уха из лосося, нарезки, чай, кофе
✓ Малкинские термальные источники (купание)
✓ Возвращение в город

В стоимость входит: трансфер, питание, гид, повар, удочки, снаряжение.`,
        'boat_trip',
        'river',
        13000,
        'per_person',
        'Река Быстрая, Малкинские горячие источники',
        6
      ]
    );

    // Create availability slots (4 per day, July-October 2026)
    await pool.query(
      `WITH partner AS (
         SELECT id FROM partners WHERE slug = 'kamchatka-rafting'
       ),
       tour AS (
         SELECT id FROM operator_tours
         WHERE operator_id = (SELECT id FROM partner)
         AND title LIKE '%СПЛАВ ПО РЕКЕ БЫСТРАЯ%'
         LIMIT 1
       )
       INSERT INTO tour_availability (
         id, operator_tour_id, date, available_slots, booked_slots, created_at
       )
       SELECT
         gen_random_uuid(),
         t.id,
         date::date,
         4, 0, NOW()
       FROM tour t,
         generate_series('2026-07-01'::date, '2026-10-31'::date, '1 day'::interval) AS date
       ON CONFLICT DO NOTHING`
    );

    // Get the created tour
    const tourRes = await pool.query<{ tour_id: string; operator_id: string }>(
      `SELECT id as tour_id, operator_id FROM operator_tours
       WHERE title LIKE '%СПЛАВ ПО РЕКЕ БЫСТРАЯ%'
       ORDER BY created_at DESC LIMIT 1`
    );

    if (tourRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Migration executed but tour not found'
      }, { status: 500 });
    }

    const { tour_id, operator_id } = tourRes.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        message: 'Migration 060 executed successfully',
        tourId: tour_id,
        operatorId: operator_id,
        title: 'Однодневная экскурсия СПЛАВ ПО РЕКЕ БЫСТРАЯ',
        price: 13000,
        nextStep: `Run auto-fill: POST /api/operator/tours/auto-fill-ai with body { "tourId": "${tour_id}" }`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute migration' },
      { status: 500 }
    );
  }
}
