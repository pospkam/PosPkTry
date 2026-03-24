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
import { notifyAdminNewBooking } from '@/lib/notifications/telegram-channel';
import { emailService } from '@/lib/notifications/email-service';
import { notifyTouristBookingCreated } from '@/lib/telegram/booking-notify';
import { query } from '@/lib/database';
import { emitEvent, AGENT_EVENTS } from '@/lib/events/emit';

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

    // Emit booking event to agent bus (fire-and-forget)
    emitEvent(AGENT_EVENTS.BOOKING_SURGE, 'system', 'info', {
      bookingId: booking.id,
      tourId,
      participants,
      totalAmount: booking.totalAmount,
      userId: auth.userId,
    });

    // Telegram-уведомление туристу: бронь принята
    notifyTouristBookingCreated(auth.userId, {
      id:           booking.id,
      tourTitle:    booking.tour.title,
      date:         booking.date,
      participants: booking.participants,
      totalAmount:  booking.totalAmount ?? 0,
    });

    // Telegram-уведомление партнёру (fire-and-forget, не блокируем ответ)
    ;(async () => {
      try {
        const partnerRow = await query<{ telegram_chat_id: string }>(
          `SELECT p.telegram_chat_id::text
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

    // Email-уведомление оператору (fire-and-forget)
    ;(async () => {
      try {
        const partnerEmailRow = await query<{ email: string }>(
          `SELECT p.contact->>'email' AS email
           FROM tours t
           JOIN partners p ON p.id = t.operator_id
           WHERE t.id = $1`,
          [tourId]
        );
        const operatorEmail = partnerEmailRow.rows[0]?.email;
        if (operatorEmail) {
          await emailService.sendOperatorNewBooking({
            bookingId:       booking.id,
            tourTitle:       booking.tour.title,
            date:            booking.date,
            participants:    booking.participants,
            totalAmount:     booking.totalAmount ?? 0,
            touristName:     booking.tourist.name,
            touristEmail:    booking.tourist.email,
            specialRequests: booking.specialRequests,
            operatorEmail,
          });
        }
      } catch { /* некритично */ }
    })();

    // Email-подтверждение туристу (fire-and-forget)
    ;(async () => {
      try {
        if (booking.tourist.email) {
          await emailService.sendBookingConfirmation({
            bookingId:       booking.id,
            touristName:     booking.tourist.name,
            touristEmail:    booking.tourist.email,
            tourTitle:       booking.tour.title,
            date:            booking.date,
            participants:    booking.participants,
            totalAmount:     booking.totalAmount,
            specialRequests: booking.specialRequests,
          });
        }
      } catch { /* не прерываем при ошибке email */ }
    })();

    // Уведомление в centralized admin-чат (fire-and-forget)
    notifyAdminNewBooking({
      id:            booking.id,
      tourName:      booking.tour.title,
      departureDate: booking.date.toISOString(),
      participants:  booking.participants,
      totalAmount:   booking.totalAmount,
      touristName:   booking.tourist.name,
      touristEmail:  booking.tourist.email,
    }).catch(() => { /* некритично */ });

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



