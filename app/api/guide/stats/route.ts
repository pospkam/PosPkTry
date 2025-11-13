import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/stats
 * Get guide statistics
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Get schedule stats
    const scheduleStats = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM guide_schedule
      WHERE guide_id = $1`,
      [userId]
    );

    // Get upcoming tours
    const upcomingTours = await query(
      `SELECT 
        gs.*,
        t.name as tour_name,
        t.difficulty as tour_difficulty
      FROM guide_schedule gs
      JOIN tours t ON gs.tour_id = t.id
      WHERE gs.guide_id = $1 
        AND gs.tour_date >= CURRENT_DATE
        AND gs.status NOT IN ('cancelled', 'completed')
      ORDER BY gs.tour_date ASC, gs.start_time ASC
      LIMIT 5`,
      [userId]
    );

    // Get groups stats
    const groupsStats = await query(
      `SELECT 
        COUNT(*) as total_groups,
        SUM(CASE WHEN gg.status = 'forming' THEN 1 ELSE 0 END) as forming,
        SUM(CASE WHEN gg.status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN gg.status = 'departed' THEN 1 ELSE 0 END) as departed,
        SUM(CASE WHEN gg.status = 'returned' THEN 1 ELSE 0 END) as returned
      FROM guide_groups gg
      JOIN guide_schedule gs ON gg.schedule_id = gs.id
      WHERE gs.guide_id = $1`,
      [userId]
    );

    // Get earnings summary
    const earningsStats = await query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_earned,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) as total_pending
      FROM guide_earnings
      WHERE guide_id = $1`,
      [userId]
    );

    const stats = {
      schedule: {
        total: parseInt(scheduleStats.rows[0].total),
        scheduled: parseInt(scheduleStats.rows[0].scheduled),
        inProgress: parseInt(scheduleStats.rows[0].in_progress),
        completed: parseInt(scheduleStats.rows[0].completed),
        cancelled: parseInt(scheduleStats.rows[0].cancelled)
      },
      groups: {
        total: parseInt(groupsStats.rows[0].total_groups),
        forming: parseInt(groupsStats.rows[0].forming),
        ready: parseInt(groupsStats.rows[0].ready),
        departed: parseInt(groupsStats.rows[0].departed),
        returned: parseInt(groupsStats.rows[0].returned)
      },
      earnings: {
        totalEarned: parseFloat(earningsStats.rows[0].total_earned),
        totalPaid: parseFloat(earningsStats.rows[0].total_paid),
        totalPending: parseFloat(earningsStats.rows[0].total_pending)
      },
      upcomingTours: upcomingTours.rows.map(row => ({
        id: row.id,
        tourDate: row.tour_date,
        startTime: row.start_time,
        endTime: row.end_time,
        tourName: row.tour_name,
        tourDifficulty: row.tour_difficulty,
        participantsCount: row.participants_count,
        maxParticipants: row.max_participants,
        status: row.status
      }))
    };

    return NextResponse.json({
      success: true,
      data: stats
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get guide stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики'
    } as ApiResponse<null>, { status: 500 });
  }
}
