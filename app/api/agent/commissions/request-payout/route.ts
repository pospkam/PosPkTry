import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAgent } from '@/lib/auth/middleware';
import { z } from 'zod';

const RequestPayoutSchema = z.object({
  paymentMethod: z.string().optional().default('bank_transfer'),
});

export const dynamic = 'force-dynamic';

/**
 * POST /api/agent/commissions/request-payout - Запросить выплату комиссионных
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const agentId = userOrResponse.userId;
    const body = await request.json();
    const parsed = RequestPayoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    const { paymentMethod } = parsed.data;

    const pendingCommissionsQuery = `
      SELECT id, amount FROM agent_commissions
      WHERE agent_id = $1 AND status = 'pending'
    `;

    const commissionsResult = await query<{ id: string; amount: string }>(pendingCommissionsQuery, [agentId]);

    if (commissionsResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Нет ожидающих комиссионных для выплаты',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const totalAmount = commissionsResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const commissionIds = commissionsResult.rows.map((row) => row.id);

    const payoutId = `payout-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const createPayoutQuery = `
      INSERT INTO commission_payouts (
        id,
        agent_id,
        total_amount,
        status,
        payment_method,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, created_at
    `;

    const payoutResult = await query<{ id: string; created_at: unknown }>(createPayoutQuery, [
      payoutId,
      agentId,
      totalAmount,
      'pending',
      paymentMethod,
    ]);

    const updateCommissionsQuery = `
      UPDATE agent_commissions
      SET status = 'processing', payout_reference = $1, updated_at = NOW()
      WHERE id = ANY($2::uuid[])
    `;

    await query(updateCommissionsQuery, [payoutId, commissionIds]);

    const newPayout = payoutResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        payoutId: newPayout.id,
        totalAmount,
        commissionCount: commissionIds.length,
        createdAt: newPayout.created_at,
      },
      message: 'Запрос на выплату комиссионных успешно создан',
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка при создании запроса на выплату',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
