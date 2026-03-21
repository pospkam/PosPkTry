import { query } from '@/lib/database';

/**
 * GET /api/safety/capacity?route_id=123
 * Returns capacity status for specific route(s)
 */
export async function GET(req: Request) {
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
      ORDER BY lrs.updated_at DESC
      LIMIT 100
    `, params);

    const rows = capacityData.rows as Array<{recommender_status: string; capacity_remaining: number}>;
    const fullCount = rows.filter((r) => r.capacity_remaining <= 0).length;
    const yellowCount = rows.filter((r) => r.recommender_status === 'yellow').length;
    const redCount = rows.filter((r) => r.recommender_status === 'red').length;

    return Response.json({
      success: true,
      data: rows,
      meta: {
        total: rows.length,
        full_locations: fullCount,
        yellow_locations: yellowCount,
        red_locations: redCount,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
