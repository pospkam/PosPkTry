/**
 * Bookings API - Detail Operations
 * GET /api/bookings/[id] - Get booking details (with logs)
 * PUT /api/bookings/[id] - Update booking (special requests only, pending status)
 * DELETE /api/bookings/[id] - Cancel booking (delegates to cancel service)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/database';
import {
  getBookingById,
  getBookingForUser,
  cancelBooking,
} from '@/lib/bookings/booking.service';
import { ApiResponse } from '@/types';

/**
 * GET /api/bookings/[id]
 * Детали бронирования с логами переходов статусов.
 * tourist — только свои, operator — туры своего партнёра, admin — всё.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId || !auth.role) {
      return NextResponse.json(
        { success: false, error: 'Требуется аутентификация' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const { id } = await params;

    // Для туриста — проверяем владение
    if (auth.role === 'tourist') {
      const booking = await getBookingForUser(id, auth.userId);
      if (!booking) {
        return NextResponse.json(
          { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: booking });
    }

    // Для оператора — проверяем что тур принадлежит его партнёру
    if (auth.role === 'operator') {
      const booking = await getBookingById(id);
      if (!booking) {
        return NextResponse.json(
          { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
          { status: 404 }
        );
      }
      // Проверяем владение туром
      const ownerCheck = await query(
        `SELECT 1 FROM tours t
         JOIN partners p ON t.operator_id = p.id
         WHERE t.id = $1 AND p.user_id = $2`,
        [booking.tour.id, auth.userId]
      );
      if (ownerCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: booking });
    }

    // Для админа — полный доступ
    if (auth.role === 'admin') {
      const booking = await getBookingById(id);
      if (!booking) {
        return NextResponse.json(
          { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: booking });
    }

    return NextResponse.json(
      { success: false, error: 'Недостаточно прав' } as ApiResponse<null>,
      { status: 403 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении бронирования' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bookings/[id]
 * Обновить бронирование (только specialRequests, только в статусе pending)
 * Только владелец бронирования.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Требуется аутентификация' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Проверяем владение и статус
    const booking = await getBookingForUser(id, auth.userId);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Можно редактировать только бронирование в статусе ожидания' } as ApiResponse<null>,
        { status: 409 }
      );
    }

    const specialRequests = typeof body.specialRequests === 'string' ? body.specialRequests : null;

    await query(
      `UPDATE bookings SET special_requests = $2, updated_at = NOW() WHERE id = $1`,
      [id, specialRequests]
    );

    const updated = await getBookingForUser(id, auth.userId);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Бронирование обновлено',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении бронирования' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookings/[id]
 * Отменить бронирование (делегирует в cancelBooking)
 * Только владелец.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Требуется аутентификация' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const { id } = await params;

    // Проверяем владение
    const existing = await getBookingForUser(id, auth.userId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    let reason = 'Отменено пользователем';
    try {
      const body = await request.json();
      if (typeof body.reason === 'string') {
        reason = body.reason;
      }
    } catch {
      // Тело необязательно для DELETE
    }

    const { booking, refund } = await cancelBooking(id, auth.userId, 'tourist', reason);

    return NextResponse.json({
      success: true,
      data: { booking, refund },
      message: refund.amount > 0
        ? `Бронирование отменено. ${refund.reason}`
        : 'Бронирование отменено. Возврат не предусмотрен.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка';

    if (message.includes('Недопустимый переход') || message.includes('Нельзя изменить')) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Ошибка при отмене бронирования' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
