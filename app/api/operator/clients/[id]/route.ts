import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/** Проверяет, что клиент является клиентом этого оператора */
async function verifyClientAccess(clientId: string, partnerId: string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM bookings b
     JOIN tours t ON b.tour_id = t.id
     WHERE b.user_id = $1 AND t.operator_id = $2
     LIMIT 1`,
    [clientId, partnerId]
  );
  return res.rows.length > 0;
}

/**
 * GET /api/operator/clients/[id]
 * Профиль клиента: бронирования, отзывы, теги, экобаллы
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const partnerId = await getOperatorPartnerId(userOrResponse.userId);
    if (!partnerId) {
      return NextResponse.json({ success: false, error: 'Партнёрский профиль не найден' }, { status: 404 });
    }

    const { id } = await context.params;
    const hasAccess = await verifyClientAccess(id, partnerId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Клиент не найден' }, { status: 404 });
    }

    // 1. Инфо о клиенте + теги из preferences + экобаллы
    const userRes = await query(
      `SELECT
         u.id, u.name, u.email, u.phone,
         u.preferences,
         COALESCE(ep.total_points, 0)::int AS eco_points
       FROM users u
       LEFT JOIN user_eco_points ep ON ep.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }
    const u = userRes.rows[0] as {
      id: string; name: string; email: string; phone: string | null;
      preferences: { tags?: string[] } | null; eco_points: number;
    };
    const tags: string[] = u.preferences?.tags ?? [];

    // 2. Все бронирования клиента у этого оператора
    interface BookingRow {
      id: string; status: string; total_price: unknown;
      guests_count: number; start_date: unknown; created_at: unknown; tour_name: string;
    }
    const bookingsRes = await query<BookingRow>(
      `SELECT
         b.id, b.status, b.total_price::numeric, b.guests_count,
         b.start_date, b.created_at,
         t.name AS tour_name
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       WHERE b.user_id = $1 AND t.operator_id = $2
       ORDER BY b.created_at DESC
       LIMIT 50`,
      [id, partnerId]
    );

    // 3. Отзывы клиента на туры этого оператора
    interface ReviewRow {
      id: string; rating: number; comment: string | null;
      is_verified: boolean; created_at: unknown; tour_name: string;
    }
    const reviewsRes = await query<ReviewRow>(
      `SELECT
         r.id, r.rating, r.comment, r.is_verified, r.created_at,
         t.name AS tour_name
       FROM reviews r
       JOIN tours t ON r.tour_id = t.id
       WHERE r.user_id = $1 AND t.operator_id = $2
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [id, partnerId]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? '',
        ecoPoints: u.eco_points,
        tags,
        bookings: bookingsRes.rows.map((b) => ({
          id:          b.id,
          tourName:    b.tour_name,
          status:      b.status,
          totalPrice:  parseFloat(String(b.total_price)),
          guestsCount: b.guests_count,
          startDate:   b.start_date ? new Date(b.start_date as string).toISOString() : null,
          createdAt:   new Date(b.created_at as string).toISOString(),
        })),
        reviews: reviewsRes.rows.map((r) => ({
          id:         r.id,
          tourName:   r.tour_name,
          rating:     r.rating,
          comment:    r.comment ?? '',
          isVerified: r.is_verified,
          createdAt:  new Date(r.created_at as string).toISOString(),
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/operator/clients/[id]
 * Обновить теги клиента (хранятся в users.preferences->>'tags')
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const partnerId = await getOperatorPartnerId(userOrResponse.userId);
    if (!partnerId) {
      return NextResponse.json({ success: false, error: 'Партнёрский профиль не найден' }, { status: 404 });
    }

    const { id } = await context.params;
    const hasAccess = await verifyClientAccess(id, partnerId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Клиент не найден' }, { status: 404 });
    }

    const body = await request.json() as { tags?: unknown };
    if (!Array.isArray(body.tags) || !body.tags.every((t) => typeof t === 'string')) {
      return NextResponse.json({ success: false, error: 'tags должен быть массивом строк' }, { status: 400 });
    }

    const tags = (body.tags as string[]).slice(0, 10); // максимум 10 тегов

    await query(
      `UPDATE users
       SET preferences = jsonb_set(COALESCE(preferences, '{}'), '{tags}', $2::jsonb, true),
           updated_at = NOW()
       WHERE id = $1`,
      [id, JSON.stringify(tags)]
    );

    return NextResponse.json({ success: true, data: { id, tags } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
