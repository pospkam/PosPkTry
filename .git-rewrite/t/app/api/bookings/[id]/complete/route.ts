/**
 * PATCH /api/bookings/[id]/complete
 * Завершить бронирование: confirmed -> completed
 * Роль: operator, admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { completeBooking } from '@/lib/bookings/booking.service';
import { loyaltySystem } from '@/lib/loyalty/loyalty-system';
import { ApiResponse } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId || !auth.role) {
      return NextResponse.json(
        { success: false, error: 'Требуется аутентификация' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // 2. Проверка роли: только operator или admin
    if (auth.role !== 'operator' && auth.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав. Только оператор или админ может завершить бронирование.' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const { id: bookingId } = await params;

    // 3. Бизнес-логика
    const booking = await completeBooking(bookingId, auth.userId);

    // 4. Начислить баллы лояльности (fire-and-forget)
    if (booking.tourist?.id && booking.totalAmount > 0) {
      loyaltySystem.earnPoints(booking.tourist.id, bookingId, booking.totalAmount).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Бронирование завершено',
    } as ApiResponse<typeof booking>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';

    if (message.includes('не найдено')) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 404 }
      );
    }
    if (message.includes('Недопустимый переход') || message.includes('Нельзя изменить')) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Ошибка при завершении бронирования' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
