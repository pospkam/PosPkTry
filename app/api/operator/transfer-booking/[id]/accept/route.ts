import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, transaction } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * PATCH /api/operator/transfer-booking/[id]/accept
 * Принятие входящего переброса бронирования через operator_booking_transfers.
 * Ownership: to_operator_user_id === текущий пользователь.
 * Действия при принятии:
 *   1) Обновление статуса переброса → accepted
 *   2) Переназначение бронирования на тур принимающего оператора (если targetTourId передан)
 *   3) Расчёт комиссии и создание payout-записей
 *   4) Уведомление отправителя
 *   5) Отмена остальных pending-офферов по тому же бронированию
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const operatorId = await getOperatorPartnerId(userOrResponse.userId);
    if (!operatorId) {
      return NextResponse.json(
        { success: false, error: 'Партнёрский профиль оператора не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const parsed = paramsSchema.safeParse(await params);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues } as unknown as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Опциональный целевой тур (объект может быть пустым)
    let targetTourId: string | null = null;
    try {
      const body = await request.json();
      if (body?.targetTourId && typeof body.targetTourId === 'string') {
        targetTourId = body.targetTourId;
      }
    } catch {
      // Тело может отсутствовать — это нормально
    }

    // Получаем данные переброса с ownership-проверкой
    const transferResult = await query<{
      id: string;
      booking_id: string;
      from_operator_partner_id: string;
      to_operator_partner_id: string;
      from_operator_user_id: string;
      to_operator_user_id: string;
      commission_percent: string;
      status: string;
    }>(
      `SELECT id, booking_id, from_operator_partner_id, to_operator_partner_id,
              from_operator_user_id, to_operator_user_id, commission_percent, status
       FROM operator_booking_transfers
       WHERE id = $1 AND to_operator_user_id = $2
       LIMIT 1`,
      [parsed.data.id, userOrResponse.userId]
    );

    if (transferResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Переброс не найден или уже обработан' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const transfer = transferResult.rows[0];

    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Переброс уже обработан' } as ApiResponse<null>,
        { status: 409 }
      );
    }

    // Проверяем состояние бронирования — нельзя принять переброс завершённого/отменённого
    const bookingResult = await query<{ total_price: string; status: string; tour_id: string }>(
      `SELECT total_price, status, tour_id FROM bookings WHERE id = $1 LIMIT 1`,
      [transfer.booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Бронирование не найдено' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];
    if (['cancelled', 'completed'].includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: 'Нельзя принять переброс для завершённого или отменённого бронирования' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Если передан targetTourId — проверяем, что тур принадлежит принимающему оператору
    if (targetTourId) {
      const tourCheck = await query<{ id: string }>(
        `SELECT id FROM tours WHERE id = $1 AND operator_id = $2 LIMIT 1`,
        [targetTourId, operatorId]
      );
      if (tourCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Целевой тур не найден или недоступен' } as ApiResponse<null>,
          { status: 404 }
        );
      }
    }

    // Расчёт комиссии
    const bookingTotal = parseFloat(booking.total_price) || 0;
    const commissionPercent = parseFloat(transfer.commission_percent) || 0;
    const commissionAmount = Number(((bookingTotal * commissionPercent) / 100).toFixed(2));
    const netAmount = Number((bookingTotal - commissionAmount).toFixed(2));

    await transaction(async (client) => {
      // 1) Фиксируем принятие переброса и сохраняем рассчитанную комиссию
      await client.query(
        `UPDATE operator_booking_transfers
         SET status = 'accepted',
             commission_amount = $2,
             target_tour_id = COALESCE($3, target_tour_id),
             responded_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [transfer.id, commissionAmount, targetTourId]
      );

      // 2) Переназначаем бронирование на тур оператора Б (если указан)
      if (targetTourId) {
        await client.query(
          `UPDATE bookings SET tour_id = $2, updated_at = NOW() WHERE id = $1`,
          [transfer.booking_id, targetTourId]
        );
      }

      // 3) Отменяем остальные pending-офферы по этому бронированию
      await client.query(
        `UPDATE operator_booking_transfers
         SET status = 'cancelled', responded_at = NOW(), updated_at = NOW()
         WHERE booking_id = $1 AND id <> $2 AND status = 'pending'`,
        [transfer.booking_id, transfer.id]
      );

      // 4) Финансовые записи: комиссия оператора А и доход оператора Б
      await client.query(
        `INSERT INTO payouts (partner_id, booking_id, amount, currency, status, description, created_at, updated_at)
         VALUES ($1, $2, $3, 'RUB', 'pending', $4, NOW(), NOW())`,
        [transfer.from_operator_partner_id, transfer.booking_id, commissionAmount, 'Комиссия за переброс бронирования']
      );

      await client.query(
        `INSERT INTO payouts (partner_id, booking_id, amount, currency, status, description, created_at, updated_at)
         VALUES ($1, $2, $3, 'RUB', 'pending', $4, NOW(), NOW())`,
        [transfer.to_operator_partner_id, transfer.booking_id, netAmount, 'Доход за переброшенное бронирование']
      );
    });

    // 5) Уведомление отправителю о принятии
    await query(
      `INSERT INTO notifications (user_id, type, title, message, priority, action_url)
       VALUES ($1, $2, $3, $4, 'normal', $5)`,
      [
        transfer.from_operator_user_id,
        'booking_transfer_accepted',
        'Переброс принят',
        'Ваш запрос на переброс бронирования принят',
        '/hub/operator/transfers',
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: transfer.id,
        status: 'accepted',
        commissionPercent,
        commissionAmount,
        netAmount,
      },
      message: 'Переброс принят',
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Не удалось принять переброс' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
