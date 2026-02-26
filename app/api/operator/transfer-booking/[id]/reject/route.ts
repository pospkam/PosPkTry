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
 * Отклонение входящего переброса бронирования.
 * Ownership: WHERE id = $1 AND to_operator_id = $2
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
        { success: false, error: parsed.error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Ownership: только получатель может отклонить, и только в статусе pending
    const result = await query<{ id: string; status: string }>(
      `UPDATE booking_transfers
       SET status = 'rejected', updated_at = now()
       WHERE id = $1 AND to_operator_id = $2 AND status = 'pending'
       RETURNING id, status`,
      [parsed.data.id, operatorId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Переброс не найден или уже обработан' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id, status: 'rejected' },
      message: 'Переброс отклонён',
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('[TRANSFER_REJECT]', error);
    return NextResponse.json(
      { success: false, error: 'Не удалось отклонить переброс' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
