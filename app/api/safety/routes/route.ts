import { query } from '@/lib/database';

interface RouteRow {
  agent_route_id: number;
  title: string;
  location_type: string;
  activity_type: string;
  difficulty_level: number;
  capacity_remaining: number;
  optimal_group_size: number;
  hazard_types: string[];
  active_alerts: string[];
  alert_severity: number;
  recommender_status: string;
  safety_score: number;
  is_open: boolean;
  tourists_today: number;
}

/**
 * GET /api/safety/routes
 * Smart recommender for tourists
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const groupSize = parseInt(searchParams.get('group_size') || '1');
    const maxDifficulty = parseInt(searchParams.get('difficulty') || '5');
    const activityType = searchParams.get('activity_type');

    let activityFilter = '';
    const params: unknown[] = [groupSize, maxDifficulty];

    if (activityType) {
      activityFilter = ` AND ark.activity_type = $${params.length + 1}`;
      params.push(activityType);
    }

    const routes = await query(`
      SELECT
        lrs.agent_route_id,
        ark.title,
        ark.location_type,
        ark.activity_type,
        lsp.capacity_per_day,
        lsp.difficulty_level,
        lsp.hazard_types,
        lsp.weather_threshold,
        lrs.tourists_today,
        lrs.tourists_hour,
        lrs.recommender_status,
        lrs.active_alerts,
        lrs.alert_severity,
        lrs.is_open,
        COALESCE(lsp.capacity_per_day, 50) - COALESCE(lrs.tourists_today, 0) as capacity_remaining,
        COALESCE(lsp.optimal_group_size, 8) as optimal_group_size,
        (
          CASE
            WHEN lrs.alert_severity >= 2 THEN 0
            WHEN lrs.recommender_status = 'yellow' THEN 0.5
            WHEN COALESCE(lsp.capacity_per_day, 50) - COALESCE(lrs.tourists_today, 0) < $1 THEN 0
            WHEN lsp.difficulty_level > $2 THEN 0
            WHEN lrs.is_open = FALSE THEN 0
            ELSE 
              (1 - (COALESCE(lrs.tourists_today, 0)::FLOAT / COALESCE(lsp.capacity_per_day, 50))) *
              (1 - (lsp.difficulty_level::FLOAT / 5)) *
              (1 - (COALESCE(array_length(lrs.active_alerts, 1), 0)::FLOAT / 3))
          END
        ) as safety_score
      FROM location_real_time_status lrs
      LEFT JOIN agent_route_knowledge ark ON lrs.agent_route_id = ark.id
      LEFT JOIN location_safety_profile lsp ON lsp.agent_route_id = lrs.agent_route_id
      WHERE
        lrs.is_open = TRUE
        AND COALESCE(lsp.capacity_per_day, 50) - COALESCE(lrs.tourists_today, 0) >= $1
        AND lsp.difficulty_level <= $2
        ${activityFilter}
      ORDER BY safety_score DESC
      LIMIT 20
    `, params);

    const rows = routes.rows as unknown as RouteRow[];
    const recommendations = rows.map((r) => ({
      id: r.agent_route_id,
      title: r.title,
      location_type: r.location_type,
      activity_type: r.activity_type,
      difficulty: r.difficulty_level,
      capacity_remaining: r.capacity_remaining,
      optimal_group_size: r.optimal_group_size,
      hazards: r.hazard_types || [],
      alerts: r.active_alerts || [],
      alert_severity: r.alert_severity,
      status: r.recommender_status,
      safety_score: r.safety_score,
      reason:
        r.alert_severity >= 2
          ? 'Закрыто: опасность'
          : r.recommender_status === 'yellow'
            ? 'Заполняется'
            : 'Безопасно',
    }));

    return Response.json({
      success: true,
      data: recommendations,
      meta: {
        date,
        group_size: groupSize,
        total_available: recommendations.length,
        recommended: recommendations.filter((r) => r.safety_score > 0.7).length,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
