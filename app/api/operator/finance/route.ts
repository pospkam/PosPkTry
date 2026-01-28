import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';
import { ApiResponse } from '@/types';
import { FinanceData, Transaction } from '@/types/operator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/finance
 * Получение финансовых данных оператора
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const operatorId = searchParams.get('operatorId');
    const period = parseInt(searchParams.get('period') || '30');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Основные финансовые показатели
    const financeQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') AND b.payment_status = 'pending' THEN b.total_price ELSE 0 END), 0) as pending_payouts,
        COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.payment_status = 'paid' THEN b.total_price ELSE 0 END), 0) as completed_payouts,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price * 0.15 ELSE 0 END), 0) as commission,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price * 0.85 ELSE 0 END), 0) as net_income
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
    `;

    const financeResult = await query(financeQuery, [operatorId, startDate]);
    const financeRow = financeResult.rows[0];

    // Транзакции
    const transactionsQuery = `
      SELECT
        b.id,
        'booking' as type,
        b.total_price as amount,
        b.payment_status as status,
        b.created_at as date,
        CONCAT('Booking for ', t.name, ' by ', u.name) as description,
        b.id as booking_id
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
      ORDER BY b.created_at DESC
      LIMIT 50
    `;

    const transactionsResult = await query(transactionsQuery, [operatorId, startDate]);
    
    const transactions: Transaction[] = transactionsResult.rows.map(row => ({
      id: row.id,
      type: row.type,
      amount: parseFloat(row.amount),
      status: row.status === 'paid' ? 'completed' : 'pending',
      date: new Date(row.date),
      description: row.description,
      bookingId: row.booking_id
    }));

    const financeData: FinanceData = {
      totalRevenue: parseFloat(financeRow.total_revenue) || 0,
      pendingPayouts: parseFloat(financeRow.pending_payouts) || 0,
      completedPayouts: parseFloat(financeRow.completed_payouts) || 0,
      commission: parseFloat(financeRow.commission) || 0,
      netIncome: parseFloat(financeRow.net_income) || 0,
      transactions
    };

    return NextResponse.json({
      success: true,
      data: financeData
    } as ApiResponse<FinanceData>);

  } catch (error) {
    console.error('Error fetching finance data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch finance data',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



