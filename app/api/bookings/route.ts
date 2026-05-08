/**
 * API Routes для бронирований (legacy маршрут — поток C)
 *
 * GET  /api/bookings — список бронирований из legacy таблицы `bookings`
 *   (пустая в продакшне; оставлен для обратной совместимости HistoryPageClient)
 *
 * POST /api/bookings — DEPRECATED (410 Gone)
 *   Legacy поток через `tours` + `bookings` отключён 2026-05-07.
 *   Используйте /api/hub/bookings/create для бронирования.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';
import { listBookings } from '@/lib/bookings/booking.service';
import { query } from '@/lib/database';
import type { BookingWithDetails } from '@/types/booking.types';

// GET /api/bookings — Получение бронирований с ролевой фильтрацией
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId || !auth.role) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // Определяем роль для фильтрации
    const roleMap: Record<string, 'tourist' | 'operator' | 'admin'> = {
      tourist: 'tourist',
      operator: 'operator',
      admin: 'admin',
    };
    const listRole = roleMap[auth.role];
    if (!listRole) {
      return NextResponse.json(
        { success: false, error: 'Роль не имеет доступа к бронированиям' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const { bookings: legacyBookings, total: legacyTotal } = await listBookings({
      userId: auth.userId,
      role: listRole,
      status,
      // For tourists we fetch all then paginate in-memory so we can merge both tables
      limit: listRole === 'tourist' ? 1000 : limit,
      offset: listRole === 'tourist' ? 0 : offset,
    });

    // For tourists: also include operator_bookings (new marketplace flow)
    let combined: BookingWithDetails[] = legacyBookings;
    let combinedTotal = legacyTotal;

    if (listRole === 'tourist') {
      const STATUS_MAP: Record<string, string> = {
        new: 'pending', confirmed: 'confirmed',
        completed: 'completed', cancelled: 'cancelled', no_show: 'completed',
      };
      const opResult = await query<{
        id: string; booking_status: string; payment_status: string;
        tour_id: string; tour_title: string; tour_price: string;
        tourist_name: string; tourist_email: string; tourist_id: string;
        booking_date: Date; participants: number; final_price: string;
        cancelled_at: Date | null; special_requests: string | null;
        created_at: Date; updated_at: Date;
      }>(
        `SELECT ob.id::text, ob.booking_status, ob.payment_status,
                ot.id::text AS tour_id, ot.title AS tour_title, ot.base_price::text AS tour_price,
                ob.tourist_name, ob.tourist_email,
                (ob.metadata->>'user_id') AS tourist_id,
                ob.booking_date, ob.participants, ob.final_price::text,
                ob.cancelled_at, ob.special_requests,
                ob.created_at, ob.updated_at
         FROM operator_bookings ob
         JOIN operator_tours ot ON ot.id = ob.operator_tour_id
         WHERE ob.metadata->>'user_id' = $1
         ORDER BY ob.created_at DESC
         LIMIT 1000`,
        [auth.userId]
      );

      const opBookings: BookingWithDetails[] = opResult.rows
        .filter(r => {
          if (!status) return true;
          const mapped = STATUS_MAP[r.booking_status] ?? 'pending';
          return mapped === status;
        })
        .map(r => ({
          id: `op-${r.id}`,
          status: (STATUS_MAP[r.booking_status] ?? 'pending') as BookingWithDetails['status'],
          tour: { id: r.tour_id, title: r.tour_title, price: Number(r.tour_price) },
          tourist: { id: r.tourist_id ?? auth.userId, name: r.tourist_name ?? '', email: r.tourist_email ?? '' },
          date: new Date(r.booking_date),
          participants: r.participants,
          totalAmount: Number(r.final_price),
          refundAmount: null,
          cancelledAt: r.cancelled_at ? new Date(r.cancelled_at) : null,
          cancelledBy: null,
          specialRequests: r.special_requests ?? null,
          paymentStatus: r.payment_status,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
          logs: [],
        }));

      combined = [...legacyBookings, ...opBookings]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      combinedTotal = combined.length;
      combined = combined.slice(offset, offset + limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        bookings: combined,
        total: combinedTotal,
        limit,
        offset,
      },
    } as ApiResponse<{ bookings: BookingWithDetails[]; total: number; limit: number; offset: number }>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении бронирований' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// POST /api/bookings — DEPRECATED. Legacy flow C (tours + bookings tables) was
// disabled 2026-05-07 after diagnosis showed the bookings table was empty
// (zero rows ever) and the tours table held only stale demo data.
// New bookings flow through /api/hub/bookings/create -> operator_bookings.
export function POST(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Этот эндпоинт устарел. Используйте /api/hub/bookings/create для новых бронирований.',
    } as ApiResponse<null>,
    { status: 410 },
  );
}



