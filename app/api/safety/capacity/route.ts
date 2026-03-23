import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';

/**
 * GET /api/safety/capacity?route_id=123
 * Returns capacity status — admin only
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get('route_id');

    let whereClause = '1=1';
    const params: unknown[] = [];

    if (routeId) {
      whereClause = 'lrs.agent_route_id = $1';
      params.push(parseInt(routeId));
    }

    const capacityData = await query(`
      SELECT
        lrs.agent_route_id,
        ark.title,
        ark.location_type,
        ark.activity_type,
        lsp.capacity_per_day,
        lsp.capacity_per_hour,
        lsp.optimal_group_size,
        lsp.difficulty_level,
        lsp.hazard_types,
        lrs.tourists_today,
        lrs.tourists_hour,
        lrs.recommender_status,
        lrs.active_alerts,
        lrs.alert_severity,
        lrs.is_open,
        COALESCE(lsp.capacity_per_day, 50) - COALESCE(lrs.tourists_today, 0) as capacity_remaining,
        ROUND(100.0 * COALESCE(lrs.tourists_today,0) / NULLIF(COALESCE(lsp.capacity_per_day, 50), 0), 1) as capacity_percent,
        lrs.updated_at
      FROM location_real_time_status lrs
      LEFT JOIN agent_route_knowledge ark ON lrs.agent_route_id = ark.id
      LEFT JOIN location_safety_profile lsp ON lsp.agent_route_id = lrs.agent_route_id
      WHERE ${whereClause}
      ORDER BY
        CASE lrs.recommender_status WHEN 'red' THEN 0 WHEN 'yellow' THEN 1 ELSE 2 END,
        lrs.alert_severity DESC,
        lrs.updated_at DESC
      LIMIT 200
    `, params);

    // Accurate totals across all rows (not capped at display limit)
    const totals = await query(`
      SELECT
        count(*)::int                                            AS total,
        count(*) FILTER (WHERE recommender_status = 'red')::int  AS red_count,
        count(*) FILTER (WHERE recommender_status = 'yellow')::int AS yellow_count
      FROM location_real_time_status
      WHERE ${whereClause}
    `, params);
    const { total, red_count, yellow_count } = totals.rows[0] as {total: number; red_count: number; yellow_count: number};

    return Response.json({
      success: true,
      data: capacityData.rows,
      meta: {
        total,
        red_locations: red_count,
        yellow_locations: yellow_count,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
