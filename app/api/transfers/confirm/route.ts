import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { z } from 'zod';
import { TransferConfirmationRequest, TransferConfirmationResponse } from '@/types/transfer';
import { config } from '@/lib/config';
import { requireTransferOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const confirmTransferSchema = z.object({
  bookingId: z.string().uuid(),
  action: z.enum(['confirm', 'reject']),
  message: z.string().max(2000).optional(),
});

// POST /api/transfers/confirm - Подтверждение/отклонение бронирования перевозчиком
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireTransferOperator(request);
    if (authResult instanceof NextResponse) return authResult;

    const body: unknown = await request.json();
    const parsed = confirmTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      }, { status: 400 });
    }

    const { bookingId, action, message } = parsed.data;

    try {
      // Получаем информацию о бронировании
      const bookingQuery = `
        SELECT b.*, s.*, r.*, v.*, d.*, o.name as operator_name
        FROM transfer_bookings b
        JOIN transfer_schedules s ON b.schedule_id = s.id
        JOIN transfer_routes r ON s.route_id = r.id
        JOIN transfer_vehicles v ON s.vehicle_id = v.id
        JOIN transfer_drivers d ON s.driver_id = d.id
        JOIN operators o ON v.operator_id = o.id
        WHERE b.id = $1
      `;

      const bookingResult = await query(bookingQuery, [bookingId]);

      if (bookingResult.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Бронирование не найдено'
        }, { status: 404 });
      }

      const booking = bookingResult.rows[0];

      // Проверяем, что бронирование в статусе pending
      if (booking.status !== 'pending') {
        return NextResponse.json({
          success: false,
          error: `Бронирование уже обработано. Текущий статус: ${booking.status}`
        }, { status: 400 });
      }

      const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
      const statusMessage = action === 'confirm' ? 'подтверждено' : 'отклонено';

      // Обновляем статус бронирования
      const updateBookingQuery = `
        UPDATE transfer_bookings
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const updateResult = await query<{ id: string; status: string }>(updateBookingQuery, [newStatus, bookingId]);
      const updatedBooking = updateResult.rows[0];

      // Если бронирование отклонено, возвращаем места в расписание
      if (action === 'reject') {
        const returnSeatsQuery = `
          UPDATE transfer_schedules
          SET available_seats = available_seats + $1, updated_at = NOW()
          WHERE id = $2
        `;

        await query(returnSeatsQuery, [booking.passengers_count, booking.schedule_id]);
      }

      // Создаем уведомление для клиента
      const notificationQuery = `
        INSERT INTO transfer_notifications (
          booking_id, user_id, type, title, message
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      const notificationType = action === 'confirm' ? 'booking_confirmed' : 'booking_cancelled';
      const notificationTitle = action === 'confirm' ?
        'Бронирование подтверждено' : 'Бронирование отклонено';
      const notificationMessage = action === 'confirm' ?
        `Ваше бронирование трансфера подтверждено. Водитель: ${booking.name}, Телефон: ${booking.phone}` :
        `Ваше бронирование трансфера отклонено. ${message || 'Причина не указана'}`;

      await query(notificationQuery, [
        booking.id,
        booking.user_id,
        notificationType,
        notificationTitle,
        notificationMessage
      ]);

      // Отправляем уведомления клиенту (заглушка)
      await sendConfirmationNotifications(updatedBooking, action, message);

      const response: TransferConfirmationResponse = {
        success: true,
        data: {
          bookingId: updatedBooking.id,
          newStatus: updatedBooking.status,
          message: `Бронирование успешно ${statusMessage}`
        }
      };

      return NextResponse.json(response);

    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : 'Ошибка БД';
      return NextResponse.json({
        success: false,
        error: `Ошибка при обработке бронирования: ${msg}`
      }, { status: 503 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при обработке подтверждения'
    }, { status: 500 });
  }
}

async function sendConfirmationNotifications(
  booking: Record<string, unknown>,
  action: string,
  message?: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) return;

  const status = action === 'confirm' ? 'ПОДТВЕРЖДЕНО' : 'ОТКЛОНЕНО';
  const lines = [
    `[Трансфер ${status}]`,
    `Бронирование: ${booking.id as string}`,
    `Пассажиров: ${booking.passengers_count ?? '?'}`,
    message ? `Причина: ${message}` : '',
  ].filter(Boolean).join('\n');

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines }),
  }).catch(() => null); // уведомления — некритично
}