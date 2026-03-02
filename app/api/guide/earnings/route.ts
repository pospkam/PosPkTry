import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireRole } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/earnings
 * Get guide's earnings
 */
export async function GET(request: NextRequest) {
  try {
    const guideOrResponse = await requireRole(request, ['guide', 'admin']);
    if (guideOrResponse instanceof NextResponse) return guideOrResponse;
    const userId = guideOrResponse.userId;

    // Get earnings list
    const earningsResult = await query(
      `SELECT 
        ge.*,
        t.name as tour_name,
        gs.tour_date
      FROM guide_earnings ge
      LEFT JOIN tours t ON ge.tour_id = t.id
      LEFT JOIN guide_schedule gs ON ge.schedule_id = gs.id
      WHERE ge.guide_id = $1
      ORDER BY ge.created_at DESC`,
      [userId]
    );

    // Get summary statistics
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_earned,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE(AVG(commission_rate), 10.00) as avg_commission_rate
      FROM guide_earnings
      WHERE guide_id = $1`,
      [userId]
    );

    const earnings = earningsResult.rows.map(row => ({
      id: row.id,
      amount: parseFloat(row.amount),
      commissionRate: parseFloat(row.commission_rate),
      commissionAmount: parseFloat(row.commission_amount),
      paymentStatus: row.payment_status,
      paymentDate: row.payment_date,
      notes: row.notes,
      createdAt: row.created_at,
      tourName: row.tour_name,
      tourDate: row.tour_date
    }));

    const stats = {
      totalCount: parseInt(statsResult.rows[0].total_count),
      totalEarned: parseFloat(statsResult.rows[0].total_earned),
      totalPaid: parseFloat(statsResult.rows[0].total_paid),
      totalPending: parseFloat(statsResult.rows[0].total_pending),
      totalCommission: parseFloat(statsResult.rows[0].total_commission),
      avgCommissionRate: parseFloat(statsResult.rows[0].avg_commission_rate)
    };

    return NextResponse.json({
      success: true,
      data: { earnings, stats }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get guide earnings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении доходов'
    } as ApiResponse<null>, { status: 500 });
  }
}
