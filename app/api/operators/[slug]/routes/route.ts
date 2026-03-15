/**
 * GET /api/operators/[slug]/routes
 *
 * Маршруты оператора на платформе (через v_route_marketplace + agent_route_knowledge).
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug || slug.length > 100) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (ark.id)
        ark.id,
        ark.title,
        ark.category,
        ark.description,
        ark.lat,
        ark.lng,
        ark.payload->>'price_from' AS price_from,
        ark.payload->>'difficulty' AS difficulty,
        ark.payload->>'duration_days' AS duration_days,
        vm.effective_price,
        vm.tour_name,
        vm.next_departure_date,
        vm.next_departure_slots
      FROM v_route_marketplace vm
      JOIN agent_route_knowledge ark ON ark.route_id = vm.route_id
      WHERE vm.operator_slug = $1
        AND ark.is_visible = TRUE
      ORDER BY ark.id, vm.marketplace_score DESC
      LIMIT 20`,
      [slug],
    );

    const routes = result.rows.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      description: (r.description ?? '').slice(0, 200),
      lat: r.lat ? Number(r.lat) : null,
      lng: r.lng ? Number(r.lng) : null,
      priceFrom: r.effective_price ? Number(r.effective_price) : r.price_from ? Number(r.price_from) : null,
      difficulty: r.difficulty,
      durationDays: r.duration_days ? Number(r.duration_days) : null,
      sourceName: null,
      tourName: r.tour_name,
      nextDeparture: r.next_departure_date,
      nextSlots: r.next_departure_slots ? Number(r.next_departure_slots) : null,
    }));

    return NextResponse.json({ success: true, data: routes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
