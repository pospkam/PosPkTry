import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/tours
 * Get all available tours for agents to sell
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    // Published tours from operator_tours with operator info
    const result = await query<{
      id: string; title: string; description: string | null;
      activity_type: string | null; duration_hours: number | null;
      base_price: string; max_participants: number | null;
      season_start: string | null; season_end: string | null;
      operator_name: string;
    }>(
      `SELECT
        t.id, t.title, t.description, t.activity_type,
        t.duration_hours, t.base_price, t.max_participants,
        t.season_start, t.season_end,
        p.company_name as operator_name
       FROM operator_tours t
       JOIN partners p ON t.operator_id = p.id
       WHERE t.is_published = true AND t.deleted_at IS NULL
       ORDER BY t.title
       LIMIT 200`,
      []
    );

    const tours = result.rows.map(row => ({
      id: row.id,
      name: row.title,
      description: row.description,
      activityType: row.activity_type,
      duration: row.duration_hours ? `${row.duration_hours}ч` : null,
      price: parseFloat(row.base_price),
      maxGroupSize: row.max_participants,
      seasonStart: row.season_start,
      seasonEnd: row.season_end,
      operatorName: row.operator_name,
      commission: parseFloat(row.base_price) * 0.10, // 10% агентская комиссия
    }));

    return NextResponse.json({
      success: true,
      data: { tours }
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении туров'
    } as ApiResponse<null>, { status: 500 });
  }
}
