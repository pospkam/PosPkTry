/**
 * POST /api/bookings/[id]/cancel — Отмена бронирования
 *
 * Роли: tourist (свои), operator (свои туры), admin (любые)
 *
 * Бизнес-логика возвратов:
 * - Турист: >48ч = 100%, 24-48ч = 50%, <24ч = 0%
 * - Оператор/админ: всегда 100%
 *
 * Оплата офлайн — refundAmount сохраняется в БД, физический возврат вне системы.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/database';
import { cancelBooking } from '@/lib/bookings/booking.service';
import { emailService } from '@/lib/notifications/email-service';
import type { AuthRole } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId || !auth.role) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const { id: bookingId } = await params;

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Тело необязательно
    }

    // Operator marketplace bookings have the "op-" prefix
    if (bookingId.startsWith('op-')) {
      const opId = bookingId.slice(3);
      const ownerCheck = await query<{ id: string; booking_status: string }>(
        `SELECT id, booking_status FROM operator_bookings
         WHERE id = $1 AND metadata->>'user_id' = $2`,
        [opId, auth.userId]
      );
      if (ownerCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
          { status: 404 }
        );
      }
      const opBooking = ownerCheck.rows[0];
      if (!['new', 'confirmed'].includes(opBooking.booking_status)) {
        return NextResponse.json(
          { success: false, error: 'Бронирование нельзя отменить в текущем статусе' } as ApiResponse<null>,
          { status: 409 }
        );
      }
      await query(
        `UPDATE operator_bookings SET booking_status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [opId]
      );
      return NextResponse.json({
        success: true,
        message: 'Бронирование отменено.',
        data: { booking: { id: bookingId }, refund: { amount: 0, reason: '' } },
      });
    }

    const reason = typeof body.reason === 'string' ? body.reason : undefined;

    // 2. Проверка доступа: турист — только свои, оператор — свои туры, админ — всё
    const role = auth.role as AuthRole;

    if (role === 'tourist') {
      // Проверяем владение
      const ownerCheck = await query(
        'SELECT id FROM bookings WHERE id = $1 AND user_id = $2',
        [bookingId, auth.userId]
      );
      if (ownerCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
          { status: 404 }
        );
      }
    } else if (role === 'operator') {
      // Проверяем что тур принадлежит оператору
      const operatorCheck = await query(
        `SELECT b.id FROM bookings b
         JOIN tours t ON b.tour_id = t.id
         JOIN partners p ON t.operator_id = p.id
         WHERE b.id = $1 AND p.user_id = $2`,
        [bookingId, auth.userId]
      );
      if (operatorCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
          { status: 404 }
        );
      }
    } else if (role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав для отмены бронирования' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    // 3. Определяем роль для бизнес-логики
    const cancelRole: 'tourist' | 'operator' | 'admin' =
      role === 'tourist' ? 'tourist' :
      role === 'operator' ? 'operator' : 'admin';

    // 4. Бизнес-логика в транзакции
    const { booking, refund } = await cancelBooking(
      bookingId,
      auth.userId,
      cancelRole,
      reason
    );

    // Уведомляем туриста по email о возврате средств
    const userEmail = booking.tourist?.email;
    if (userEmail) {
      try {
        await emailService.sendEmail({
          to: userEmail,
          subject: `Бронирование отменено: ${booking.tour.title}`,
          html: `
            <h2>Ваше бронирование отменено</h2>
            <p><strong>Тур:</strong> ${booking.tour.title}</p>
            <p><strong>Дата:</strong> ${booking.date.toLocaleDateString('ru-RU')}</p>
            <p><strong>Участники:</strong> ${booking.participants}</p>
            ${reason ? `<p><strong>Причина:</strong> ${reason}</p>` : ''}
            ${refund.amount > 0
              ? `<p><strong>Возврат:</strong> ${refund.amount.toLocaleString('ru-RU')} ₽ — ${refund.reason}</p>`
              : '<p>Возврат средств не предусмотрен условиями отмены.</p>'
            }
            <p>Если у вас есть вопросы — <a href="mailto:support@kamhub.ru">support@kamhub.ru</a></p>
          `,
        });
      } catch {
        // Не прерываем выполнение при ошибке email
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        booking,
        refund,
      },
      message: refund.amount > 0
        ? `Бронирование отменено. ${refund.reason}`
        : 'Бронирование отменено. Возврат средств не предусмотрен.',
    } as ApiResponse<{ booking: typeof booking; refund: typeof refund }>);
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
      { success: false, error: 'Ошибка при отмене бронирования' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}


