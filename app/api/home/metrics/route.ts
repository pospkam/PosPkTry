import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

type MetricsRow = {
  routes_total: number | string;
  verified_operators: number | string;
  active_tours: number | string;
  open_bookings: number | string;
  active_operators: number | string;
};

function toInt(value: number | string | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return 0;
}

export async function GET() {
  try {
    const result = await query<MetricsRow>(`
      SELECT
        (SELECT COUNT(*)
         FROM agent_route_knowledge ark
         WHERE ark.is_visible = TRUE)::int AS routes_total,

        (SELECT COUNT(*)
         FROM partners p
         WHERE p.is_verified = TRUE)::int AS verified_operators,

        (SELECT COUNT(*)
         FROM operator_tours ot
         WHERE ot.is_active = TRUE
           AND ot.is_published = TRUE
           AND ot.deleted_at IS NULL)::int AS active_tours,

        (SELECT COUNT(*)
         FROM operator_bookings ob
         WHERE ob.deleted_at IS NULL
           AND ob.booking_status IN ('new', 'confirmed'))::int AS open_bookings,

        (SELECT COUNT(DISTINCT ot.operator_id)
         FROM operator_tours ot
         JOIN operator_bookings ob ON ob.operator_tour_id = ot.id
         WHERE ot.deleted_at IS NULL
           AND ob.deleted_at IS NULL
           AND ob.booking_status IN ('new', 'confirmed')
           AND ob.created_at >= NOW() - INTERVAL '14 days')::int AS active_operators
    `);

    const row = result.rows[0];

    const payload = {
      routesTotal: toInt(row?.routes_total),
      verifiedOperators: toInt(row?.verified_operators),
      activeTours: toInt(row?.active_tours),
      openBookings: toInt(row?.open_bookings),
      activeOperators: toInt(row?.active_operators),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch {
    return NextResponse.json(
      {
        routesTotal: 0,
        verifiedOperators: 0,
        activeTours: 0,
        openBookings: 0,
        activeOperators: 0,
        updatedAt: new Date().toISOString(),
        degraded: true,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }
}
