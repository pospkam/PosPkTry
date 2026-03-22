import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';
import type { CustomerRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

const ALLOWED_SORT = new Set(['total_spent', 'total_bookings', 'last_booking_date', 'name']);

/**
 * GET /api/operator/clients
 * CRM: список клиентов оператора с пагинацией, поиском и фильтром по статусу
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const partnerId = await getOperatorPartnerId(userOrResponse.userId);
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Партнёрский профиль не найден' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search   = (searchParams.get('search') ?? '').trim();
    const status   = searchParams.get('status') ?? 'all';
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const sortRaw  = searchParams.get('sort') ?? 'total_spent';
    const order    = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';
    const sortCol  = ALLOWED_SORT.has(sortRaw) ? sortRaw : 'total_spent';
    const offset   = (page - 1) * limit;

    const searchParam = search ? `%${search}%` : '';

    // Статус вычисляется из данных: vip = 3+ броней ИЛИ 100k+ потрачено,
    //   active = последняя бронь в течение 90 дней, inactive = иначе
    const statusExpr = `
      CASE
        WHEN cs.total_bookings >= 3 OR cs.total_spent >= 100000 THEN 'vip'
        WHEN cs.last_booking_date >= NOW() - INTERVAL '90 days'  THEN 'active'
        ELSE 'inactive'
      END
    `;

    const cte = `
      WITH client_stats AS (
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          COUNT(b.id)::int                                                        AS total_bookings,
          COALESCE(SUM(
            CASE WHEN b.status IN ('confirmed','completed')
                 THEN b.total_price::numeric ELSE 0 END
          ), 0)::numeric                                                          AS total_spent,
          MAX(b.created_at)                                                       AS last_booking_date
        FROM users u
        JOIN bookings b ON b.user_id = u.id
        JOIN tours t    ON b.tour_id = t.id
        WHERE t.operator_id = $1
        GROUP BY u.id, u.name, u.email, u.phone
      ),
      cs AS (
        SELECT *, ${statusExpr} AS status FROM client_stats
      )
    `;

    // WHERE условия
    const conditions: string[] = [];
    const params: (string | number)[] = [partnerId];

    if (search) {
      params.push(searchParam);
      conditions.push(`(cs.name ILIKE $${params.length} OR cs.email ILIKE $${params.length})`);
    }
    if (status !== 'all') {
      params.push(status);
      conditions.push(`cs.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // COUNT запрос
    const countResult = await query(
      `${cte} SELECT COUNT(*)::int AS total FROM cs ${where}`,
      params
    );
    const total = (countResult.rows[0]?.total as number | undefined) ?? 0;

    // DATA запрос
    const dataParams = [...params, limit, offset];
    const dataResult = await query<CustomerRow>(
      `${cte}
       SELECT cs.id, cs.name, cs.email, cs.phone,
              cs.total_bookings, cs.total_spent, cs.last_booking_date, cs.status
       FROM cs
       ${where}
       ORDER BY cs.${sortCol} ${order}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    const customers = dataResult.rows.map((r) => ({
      id:              r.id,
      name:            r.name,
      email:           r.email,
      phone:           r.phone ?? '',
      totalBookings:   r.total_bookings,
      totalSpent:      parseFloat(String(r.total_spent)),
      lastBookingDate: r.last_booking_date ? new Date(r.last_booking_date).toISOString() : null,
      status:          r.status,
    }));

    return NextResponse.json({
      success: true,
      data: {
        customers,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
