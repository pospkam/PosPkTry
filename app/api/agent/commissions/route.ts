import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
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

/**
 * GET /api/agent/commissions/payouts - Получить выплаты комиссионных
 */
export async function GET_PAYOUTS(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const agentId = userOrResponse.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // all, pending, processing, completed, failed
    const limit = parseInt(searchParams.get('limit') || '20');

    let whereClause = 'WHERE cp.agent_id = $1';
    const params = [agentId];

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
    const payoutsResult = await query(payoutsQuery, params);

    const payouts: CommissionPayout[] = payoutsResult.rows.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      agentName: row.agent_name,
      totalAmount: parseFloat(row.total_amount),
      commissions: (row.commissions || []).filter(c => c.id !== null).map((c: any) => ({
        id: c.id,
        agentId: row.agent_id,
        bookingId: c.bookingId,
        amount: parseFloat(c.amount),
        rate: parseFloat(c.rate),
        status: c.status,
        paidAt: c.paidAt,
        payoutReference: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      status: row.status,
      paymentMethod: row.payment_method,
      payoutDate: row.payout_date,
      completedAt: row.completed_at,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        payouts,
        total: payouts.length
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching commission payouts:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении выплат комиссионных'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/agent/commissions/request-payout - Запросить выплату комиссионных
 */
export async function POST_REQUEST_PAYOUT(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const agentId = userOrResponse.userId;

    const body = await request.json();
    const { paymentMethod = 'bank_transfer' } = body;

    // Находим все ожидающие комиссии агента
    const pendingCommissionsQuery = `
      SELECT id, amount FROM agent_commissions
      WHERE agent_id = $1 AND status = 'pending'
    `;

    const commissionsResult = await query(pendingCommissionsQuery, [agentId]);

    if (commissionsResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет ожидающих комиссионных для выплаты'
      } as ApiResponse<null>, { status: 400 });
    }

    const totalAmount = commissionsResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const commissionIds = commissionsResult.rows.map(row => row.id);

    // Создаем запрос на выплату
    const payoutId = `payout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

    const payoutResult = await query(createPayoutQuery, [
      payoutId,
      agentId,
      totalAmount,
      'pending',
      paymentMethod
    ]);

    // Обновляем статус комиссий
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
        createdAt: newPayout.created_at
      },
      message: 'Запрос на выплату комиссионных успешно создан'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error requesting commission payout:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании запроса на выплату'
    } as ApiResponse<null>, { status: 500 });
  }
}
