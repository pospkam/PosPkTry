import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';
import { BookingMyRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

const OP_STATUS_MAP: Record<string, string> = {
  new: 'pending', confirmed: 'confirmed',
  completed: 'completed', cancelled: 'cancelled', no_show: 'completed',
};

/**
 * GET /api/bookings/my
 * Get current user's bookings (legacy bookings + operator_bookings)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      } as ApiResponse<null>, { status: 401 });
    }
    const userId = auth.userId;

    // Legacy bookings
    const result = await query<BookingMyRow>(
      `SELECT
        b.id,
        b.date,
        b.participants,
        b.total_price,
        b.status,
        b.payment_status,
        b.special_requests,
        b.created_at,
        b.updated_at,
        t.id as tour_id,
        t.name as tour_name,
        t.description as tour_description,
        t.difficulty as tour_difficulty,
        t.duration as tour_duration,
        array_agg(DISTINCT a.url) as tour_images,
        p.name as operator_name,
        p.contact as operator_contact
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       LEFT JOIN partners p ON t.operator_id = p.id
       LEFT JOIN tour_assets ta ON t.id = ta.tour_id
       LEFT JOIN assets a ON ta.asset_id = a.id
       WHERE b.user_id = $1
       GROUP BY b.id, t.id, p.id
       ORDER BY b.date DESC
       LIMIT 100`,
      [userId]
    );

    const legacyBookings = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      participants: row.participants,
      totalPrice: row.total_price,
      status: row.status,
      paymentStatus: row.payment_status,
      specialRequests: row.special_requests,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tour: {
        id: row.tour_id,
        name: row.tour_name,
        description: row.tour_description,
        difficulty: row.tour_difficulty,
        duration: row.tour_duration,
        images: Array.isArray(row.tour_images) ? row.tour_images.filter(Boolean) : []
      },
      operator: {
        name: row.operator_name,
        contact: row.operator_contact
      }
    }));

    // Operator marketplace bookings
    const opResult = await query<{
      id: string; booking_date: Date; participants: number; final_price: string;
      booking_status: string; payment_status: string; special_requests: string | null;
      created_at: Date; updated_at: Date;
      tour_id: string; tour_title: string; tour_description: string | null;
      duration_days: number | null;
      operator_name: string | null; operator_contact: string | null;
    }>(
      `SELECT ob.id::text, ob.booking_date, ob.participants, ob.final_price::text,
              ob.booking_status, ob.payment_status, ob.special_requests,
              ob.created_at, ob.updated_at,
              ot.id::text AS tour_id, ot.title AS tour_title,
              ot.description AS tour_description, ot.duration_days,
              p.name AS operator_name, p.contact AS operator_contact
       FROM operator_bookings ob
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       LEFT JOIN partners p ON p.id = ot.operator_id
       WHERE ob.metadata->>'user_id' = $1
       ORDER BY ob.booking_date DESC
       LIMIT 100`,
      [userId]
    );

    const opBookings = opResult.rows.map(row => ({
      id: `op-${row.id}`,
      date: row.booking_date,
      participants: row.participants,
      totalPrice: Number(row.final_price),
      status: OP_STATUS_MAP[row.booking_status] ?? 'pending',
      paymentStatus: row.payment_status,
      specialRequests: row.special_requests ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tour: {
        id: row.tour_id,
        name: row.tour_title,
        description: row.tour_description ?? null,
        difficulty: null,
        duration: row.duration_days ?? null,
        images: []
      },
      operator: {
        name: row.operator_name ?? null,
        contact: row.operator_contact ?? null
      }
    }));

    const bookings = [...legacyBookings, ...opBookings]
      .sort((a, b) => new Date(b.date as Date).getTime() - new Date(a.date as Date).getTime());

    return NextResponse.json({
      success: true,
      data: { bookings }
    } as ApiResponse<unknown>);

  } catch {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований'
    } as ApiResponse<null>, { status: 500 });
  }
}
