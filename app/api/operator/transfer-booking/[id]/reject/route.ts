import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * PATCH /api/operator/transfer-booking/[id]/reject
 * Отклонение входящего переброса бронирования через operator_booking_transfers.
 * Ownership: to_operator_user_id === текущий пользователь.
 * После отклонения — уведомляем отправителя.
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

    // Ownership: только получатель может отклонить, и только в статусе pending
    const result = await query<{ id: string; status: string; from_operator_user_id: string }>(
      `UPDATE operator_booking_transfers
       SET status = 'rejected', responded_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND to_operator_user_id = $2 AND status = 'pending'
       RETURNING id, status, from_operator_user_id`,
      [parsed.data.id, userOrResponse.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Переброс не найден или уже обработан' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Уведомление отправителю об отклонении
    const fromUserId = result.rows[0].from_operator_user_id;
    await query(
      `INSERT INTO notifications (user_id, type, title, message, priority, action_url)
       VALUES ($1, $2, $3, $4, 'normal', $5)`,
      [
        fromUserId,
        'booking_transfer_rejected',
        'Переброс отклонён',
        'Ваш запрос на переброс бронирования отклонён',
        '/hub/operator/transfers',
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id, status: 'rejected' },
      message: 'Переброс отклонён',
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Не удалось отклонить переброс' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
