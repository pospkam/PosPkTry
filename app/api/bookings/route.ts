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
import { z } from 'zod';
import { ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import {
  listBookings,
  createBooking,
} from '@/lib/bookings/booking.service';
import type { BookingWithDetails, CreateBookingInput } from '@/types/booking.types';
import { telegramService } from '@/lib/notifications/telegram';
import { query } from '@/lib/database';

const CreateBookingSchema = z.object({
  tourId: z.string({ required_error: 'ID тура обязателен' }).uuid('tourId должен быть валидным UUID'),
  participants: z.number({ required_error: 'Количество участников обязательно' }).int('Количество участников должно быть целым числом').min(1, 'Минимум 1 участник'),
  departureId: z.string().uuid('departureId должен быть валидным UUID').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD').optional(),
  specialRequests: z.string().optional(),
}).refine(
  (data) => data.departureId || data.date,
  { message: 'Необходимо указать departureId или date', path: ['date'] }
);

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
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении бронирований' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// POST /api/bookings — Создание нового бронирования (только tourist)
const bookingLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!bookingLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов бронирования. Попробуйте позже.' } as ApiResponse<null>,
      { status: 429 }
    );
  }

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

    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    const { tourId, participants, departureId, date, specialRequests } = parsed.data;

    const input: CreateBookingInput = {
      tourId,
      date: date ?? '',
      participants,
      specialRequests: specialRequests ?? undefined,
      departureId: departureId ?? undefined,
    };

    const booking = await createBooking(auth.userId, input);

    // Telegram-уведомление партнёру (fire-and-forget, не блокируем ответ)
    // Динамически получаем telegram_chat_id из partners.contact
    ;(async () => {
      try {
        const partnerRow = await query<{ telegram_chat_id: string }>(
          `SELECT p.contact->>'telegram_chat_id' AS telegram_chat_id
           FROM tours t
           JOIN partners p ON p.id = t.operator_id
           WHERE t.id = $1`,
          [tourId]
        );
        const chatId = partnerRow.rows[0]?.telegram_chat_id ?? process.env.TELEGRAM_FISHING_CHAT_ID;
        if (chatId) {
          await telegramService.sendTourBookingNotification(chatId, {
            id:              booking.id,
            tourName:        booking.tour.title,
            departureDate:   booking.date.toISOString(),
            participants:    booking.participants,
            totalAmount:     booking.totalAmount,
            touristName:     booking.tourist.name,
            touristEmail:    booking.tourist.email,
            specialRequests: booking.specialRequests,
          });
        }
      } catch { /* не прерываем при ошибке TG */ }
    })();

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

    return NextResponse.json(
      { success: false, error: 'Ошибка при создании бронирования' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}



