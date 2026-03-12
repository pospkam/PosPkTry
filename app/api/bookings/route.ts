/**
 * API Routes для бронирований
 *
 * GET  /api/bookings — список бронирований (ролевой доступ)
 *   tourist  — видит свои
 *   operator — видит бронирования на свои туры
 *   admin    — видит всё
 *
 * POST /api/bookings — создать бронирование (роль: tourist)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';
import {
  listBookings,
  createBooking,
} from '@/lib/bookings/booking.service';
import type { BookingWithDetails, CreateBookingInput } from '@/types/booking.types';

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

    const { bookings, total } = await listBookings({
      userId: auth.userId,
      role: listRole,
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        total,
        limit,
        offset,
      },
    } as ApiResponse<{ bookings: BookingWithDetails[]; total: number; limit: number; offset: number }>);
  } catch (error) {
    console.error('[BOOKINGS_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении бронирований' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// POST /api/bookings — Создание нового бронирования (только tourist)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId || !auth.role) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // Только туристы могут создавать бронирования
    if (auth.role !== 'tourist' && auth.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Только туристы могут создавать бронирования' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tourId, date, participants, specialRequests, departureId } = body as Record<string, unknown>;

    // Валидация входных данных
    if (
      typeof tourId !== 'string' || !tourId ||
      typeof participants !== 'number' || participants < 1
    ) {
      return NextResponse.json(
        { success: false, error: 'Неверные данные: требуются tourId (string) и participants (number >= 1)' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Если нет departureId — дата обязательна
    if (typeof departureId !== 'string' || !departureId) {
      if (typeof date !== 'string' || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { success: false, error: 'Без заезда обязательно поле date в формате YYYY-MM-DD' } as ApiResponse<null>,
          { status: 400 }
        );
      }
    }

    const input: CreateBookingInput = {
      tourId,
      date: typeof date === 'string' ? date : '',
      participants,
      specialRequests: typeof specialRequests === 'string' ? specialRequests : undefined,
      departureId: typeof departureId === 'string' ? departureId : undefined,
    };

    const booking = await createBooking(auth.userId, input);

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Бронирование создано. Ожидает подтверждения оператором.',
    } as ApiResponse<BookingWithDetails>, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';

    if (message.includes('не найден') || message.includes('не активен')) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 404 }
      );
    }
    if (message.includes('Недостаточно мест')) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 409 }
      );
    }

    console.error('[BOOKINGS_POST]', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании бронирования' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}



