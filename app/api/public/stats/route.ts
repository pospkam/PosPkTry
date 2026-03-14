import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// PUBLIC: Platform-wide statistics for homepage — no auth required.
export async function GET() {
  try {
    const [routesResult, toursResult, operatorsResult, reviewsResult] = await Promise.all([
      query<{ total: number }>(
        'SELECT COUNT(*)::int AS total FROM agent_route_knowledge WHERE is_visible = TRUE'
      ),
      query<{ total: number }>(
        'SELECT COUNT(*)::int AS total FROM tours WHERE is_active = true'
      ),
      query<{ total: number }>(
        `SELECT COUNT(DISTINCT source_name)::int AS total
         FROM agent_route_knowledge
         WHERE is_visible = TRUE AND source_name NOT LIKE 'openstreetmap%'`
      ),
      query<{ total: number; avg_rating: string | null }>(
        'SELECT COUNT(*)::int AS total, ROUND(AVG(rating), 1)::text AS avg_rating FROM reviews'
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalRoutes:      routesResult.rows[0]?.total ?? 0,
        totalTours:       toursResult.rows[0]?.total ?? 0,
        verifiedPartners: operatorsResult.rows[0]?.total ?? 0,
        totalReviews: reviewsResult.rows[0]?.total ?? 0,
        avgRating: parseFloat(reviewsResult.rows[0]?.avg_rating ?? '0'),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки статистики' },
      { status: 500 }
    );
  }
}
