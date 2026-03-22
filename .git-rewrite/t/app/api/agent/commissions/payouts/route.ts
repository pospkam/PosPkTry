import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, CommissionPayout } from '@/types';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/commissions/payouts - Получить выплаты комиссионных
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const agentId = userOrResponse.userId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // all, pending, processing, completed, failed
    const limit = parseInt(searchParams.get('limit') || '20');

    let whereClause = 'WHERE cp.agent_id = $1';
    const params: (string | number)[] = [agentId];

    if (status !== 'all') {
      whereClause += ` AND cp.status = $${params.length + 1}`;
      params.push(status);
    }

    const payoutsQuery = `
      SELECT
        cp.id,
        cp.agent_id,
        a.name as agent_name,
        cp.total_amount,
        cp.status,
        cp.payment_method,
        cp.payout_date,
        cp.completed_at,
        cp.failure_reason,
        cp.created_at,
        cp.updated_at,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', ac.id,
            'bookingId', ac.booking_id,
            'amount', ac.amount,
            'rate', ac.rate,
            'status', ac.status,
            'paidAt', ac.paid_at
          )
        ) as commissions
      FROM commission_payouts cp
      JOIN agents a ON cp.agent_id = a.id
      LEFT JOIN agent_commissions ac ON cp.id = ac.payout_reference
      ${whereClause}
      GROUP BY cp.id, cp.agent_id, a.name, cp.total_amount, cp.status,
               cp.payment_method, cp.payout_date, cp.completed_at,
               cp.failure_reason, cp.created_at, cp.updated_at
      ORDER BY cp.created_at DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);
    const payoutsResult = await query<{
      id: string; agent_id: string; agent_name: string; total_amount: string;
      status: string; payment_method: unknown; payout_date: unknown;
      completed_at: unknown; failure_reason: unknown; created_at: unknown; updated_at: unknown;
      commissions: Array<{ id: string | null; bookingId: string; amount: string; rate: string; status: string; paidAt: unknown }> | null;
    }>(payoutsQuery, params);

    const payouts: CommissionPayout[] = payoutsResult.rows.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      agentName: row.agent_name,
      totalAmount: parseFloat(row.total_amount),
      commissions: (row.commissions || [])
        .filter((commission) => commission.id !== null)
        .map((commission) => ({
          id: commission.id as string,
          agentId: row.agent_id,
          bookingId: commission.bookingId as string,
          amount: parseFloat(commission.amount as string),
          rate: parseFloat(commission.rate as string),
          status: commission.status as string,
          paidAt: commission.paidAt,
          payoutReference: row.id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      status: row.status,
      paymentMethod: row.payment_method,
      payoutDate: row.payout_date,
      completedAt: row.completed_at,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        payouts,
        total: payouts.length,
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error fetching commission payouts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка при получении выплат комиссионных',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
