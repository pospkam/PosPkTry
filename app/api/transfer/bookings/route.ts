import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireTransferOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/bookings
 * Бронирования трансфера для оператора.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireTransferOperator(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    // Получаем operator_id из таблицы operators (transfer-система)
    const operatorResult = await query<{ id: string }>(
      `SELECT id FROM operators
       WHERE email = (SELECT email FROM users WHERE id = $1)
       LIMIT 1`,
      [userId]
    );

    if (operatorResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: { bookings: [], total: 0 },
      } as ApiResponse<unknown>);
    }

    const operatorId = operatorResult.rows[0].id;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page  = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const params: (string | number)[] = [operatorId];
    let where = 'WHERE b.operator_id = $1';
    if (status) {
      params.push(status);
      where += ` AND b.status = $${params.length}`;
    }

    const bookingsResult = await query<{
      id: string;
      booking_date: string;
      departure_time: string;
      passengers_count: number;
      total_price: string;
      status: string;
      contact_phone: string | null;
      contact_email: string | null;
      confirmation_code: string | null;
      created_at: string;
      from_location: string | null;
      to_location: string | null;
    }>(
      `SELECT
         b.id, b.booking_date, b.departure_time, b.passengers_count,
         b.total_price, b.status, b.contact_phone, b.contact_email,
         b.confirmation_code, b.created_at,
         r.from_location, r.to_location
       FROM transfer_bookings b
       LEFT JOIN transfer_routes r ON r.id = b.route_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        bookings: bookingsResult.rows,
        total: bookingsResult.rows.length,
        page,
        limit,
      },
    } as ApiResponse<unknown>);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Ошибка';
    return NextResponse.json({
      success: false,
      error: `Ошибка при получении бронирований: ${msg}`,
    } as ApiResponse<null>, { status: 500 });
  }
}
