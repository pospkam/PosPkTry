import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    // Admins don't get auto-created partner records; they must use /hub/admin instead
    let partnerId: string | null = null;
    if (userOrResponse.role === 'admin') {
      const row = await query(
        `SELECT id FROM partners WHERE user_id = $1 AND category = 'operator' LIMIT 1`,
        [userOrResponse.userId]
      );
      partnerId = (row.rows[0]?.id as string | undefined) ?? null;
    } else {
      partnerId = await getOperatorPartnerId(userOrResponse.userId);
    }
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Партнёрский профиль не найден. Войдите как оператор.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = Math.min(365, Math.max(7, parseInt(searchParams.get('period') || '30')));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // 1. Partner info + verification
    const partnerResult = await query(
      `SELECT p.name, p.is_verified, p.rating, p.review_count, p.category,
              u.email
       FROM partners p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [partnerId]
    );
    const partner = partnerResult.rows[0];

    // 2. Metrics: tours, bookings, revenue
    const metricsResult = await query(
      `SELECT
         COUNT(DISTINCT t.id)::int                                          AS total_tours,
         COUNT(DISTINCT CASE WHEN t.is_active THEN t.id END)::int          AS active_tours,
         COUNT(DISTINCT b.id)::int                                          AS total_bookings,
         COUNT(DISTINCT CASE WHEN b.created_at >= $2 THEN b.id END)::int   AS period_bookings,
         COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed')
                      THEN b.total_price END), 0)::numeric                 AS total_revenue,
         COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed')
                           AND b.created_at >= $2
                      THEN b.total_price END), 0)::numeric                 AS period_revenue,
         COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.id END)::int AS pending_bookings
       FROM tours t
       LEFT JOIN bookings b ON b.tour_id = t.id
       WHERE t.operator_id = $1`,
      [partnerId, startDate]
    );
    const m = metricsResult.rows[0];

    // 3. Recent bookings (10)
    const bookingsResult = await query(
      `SELECT b.id, b.status, b.total_price::numeric, b.guests_count,
              b.start_date, b.created_at,
              t.name AS tour_name,
              u.name AS tourist_name, u.email AS tourist_email
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       JOIN users u ON b.user_id = u.id
       WHERE t.operator_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [partnerId]
    );

    // 4. Top tours
    const topToursResult = await query(
      `SELECT t.id, t.name, t.price::numeric, t.is_active,
              COUNT(b.id)::int AS bookings_count,
              COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed')
                           THEN b.total_price END), 0)::numeric AS revenue,
              COALESCE(AVG(r.rating), 0)::numeric AS avg_rating,
              COUNT(DISTINCT r.id)::int AS reviews_count
       FROM tours t
       LEFT JOIN bookings b ON b.tour_id = t.id
       LEFT JOIN reviews r ON r.tour_id = t.id
       WHERE t.operator_id = $1
       GROUP BY t.id, t.name, t.price, t.is_active
       ORDER BY bookings_count DESC
       LIMIT 5`,
      [partnerId]
    );

    return NextResponse.json({
      success: true,
      data: {
        partner: {
          id: partnerId,
          name: partner?.name ?? 'Партнёр',
          isVerified: partner?.is_verified ?? false,
          rating: parseFloat(String(partner?.rating ?? 0)),
          reviewCount: partner?.review_count ?? 0,
          email: partner?.email ?? '',
          category: partner?.category ?? 'operator',
        },
        metrics: {
          totalTours: m?.total_tours ?? 0,
          activeTours: m?.active_tours ?? 0,
          totalBookings: m?.total_bookings ?? 0,
          periodBookings: m?.period_bookings ?? 0,
          totalRevenue: parseFloat(String(m?.total_revenue ?? 0)),
          periodRevenue: parseFloat(String(m?.period_revenue ?? 0)),
          pendingBookings: m?.pending_bookings ?? 0,
        },
        recentBookings: bookingsResult.rows.map((b) => ({
          id: b.id as string,
          tourName: b.tour_name as string,
          touristName: b.tourist_name as string,
          touristEmail: b.tourist_email as string,
          status: b.status as string,
          totalPrice: parseFloat(String(b.total_price)),
          guestsCount: b.guests_count as number,
          startDate: b.start_date as string,
          createdAt: b.created_at as string,
        })),
        topTours: topToursResult.rows.map((t) => ({
          id: t.id as string,
          name: t.name as string,
          price: parseFloat(String(t.price)),
          isActive: t.is_active as boolean,
          bookingsCount: t.bookings_count as number,
          revenue: parseFloat(String(t.revenue)),
          avgRating: parseFloat(String(t.avg_rating)),
          reviewsCount: t.reviews_count as number,
        })),
        period,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
