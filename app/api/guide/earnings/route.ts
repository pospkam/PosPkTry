import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/earnings - Получение доходов гида
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const guideId = userOrResponse.userId;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // month, year, all

    // Рассчитываем даты
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // Все время
    }

    // Статистика доходов
    const statsQuery = `
      SELECT
        COUNT(*) as total_tours,
        SUM(amount) as total_earned,
        SUM(commission_amount) as total_commission,
        AVG(amount) as avg_earning,
        SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as pending_amount
      FROM guide_earnings
      WHERE guide_id = $1
        AND created_at >= $2
    `;

    const statsResult = await query(statsQuery, [guideId, startDate]);
    const stats = statsResult.rows[0];

    // Детальный список
    const earningsQuery = `
      SELECT
        ge.id,
        ge.amount,
        ge.commission_rate,
        ge.commission_amount,
        ge.payment_status,
        ge.payment_date,
        ge.notes,
        ge.created_at,
        t.name as tour_name,
        gs.tour_date,
        gs.participants_count
      FROM guide_earnings ge
      LEFT JOIN tours t ON ge.tour_id = t.id
      LEFT JOIN guide_schedule gs ON ge.schedule_id = gs.id
      WHERE ge.guide_id = $1
        AND ge.created_at >= $2
      ORDER BY ge.created_at DESC
      LIMIT 50
    `;

    const earningsResult = await query(earningsQuery, [guideId, startDate]);

    // График по месяцам
    const chartQuery = `
      SELECT
        to_char(created_at, 'YYYY-MM') as month,
        SUM(amount) as total,
        COUNT(*) as tours_count
      FROM guide_earnings
      WHERE guide_id = $1
        AND created_at >= $2
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `;

    const chartResult = await query(chartQuery, [guideId, startDate]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalTours: parseInt(stats.total_tours) || 0,
          totalEarned: parseFloat(stats.total_earned) || 0,
          totalCommission: parseFloat(stats.total_commission) || 0,
          avgEarning: parseFloat(stats.avg_earning) || 0,
          paidAmount: parseFloat(stats.paid_amount) || 0,
          pendingAmount: parseFloat(stats.pending_amount) || 0
        },
        earnings: earningsResult.rows,
        chart: chartResult.rows
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching earnings:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки доходов' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}





























