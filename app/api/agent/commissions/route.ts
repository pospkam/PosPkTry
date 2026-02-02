import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, AgentCommission, CommissionPayout } from '@/types';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/commissions - Получить комиссионные агента
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const agentId = userOrResponse.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // all, pending, paid, cancelled
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause = 'WHERE agent_id = $1';
    const params = [agentId];

    if (status !== 'all') {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    const commissionsQuery = `
      SELECT
        id,
        agent_id,
        booking_id,
        amount,
        rate,
        status,
        paid_at,
        payout_reference,
        notes,
        created_at,
        updated_at
      FROM agent_commissions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);
    const commissionsResult = await query(commissionsQuery, params);

    const commissions: AgentCommission[] = commissionsResult.rows.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      bookingId: row.booking_id,
      amount: parseFloat(row.amount),
      rate: parseFloat(row.rate),
      status: row.status,
      paidAt: row.paid_at,
      payoutReference: row.payout_reference,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // Получаем общую статистику комиссий
    const statsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) as total_pending,
        COALESCE(SUM(amount), 0) as total_all
      FROM agent_commissions
      WHERE agent_id = $1
    `;

    const statsResult = await query(statsQuery, [agentId]);
    const stats = statsResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        commissions,
        stats: {
          totalPaid: parseFloat(stats.total_paid),
          totalPending: parseFloat(stats.total_pending),
          totalAll: parseFloat(stats.total_all)
        },
        total: commissions.length
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching agent commissions:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении комиссионных'
    } as ApiResponse<null>, { status: 500 });
  }
}

// TODO: Переместить GET_PAYOUTS и POST_REQUEST_PAYOUT в отдельные API роуты
// /api/agent/commissions/payouts и /api/agent/commissions/request-payout
