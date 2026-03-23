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
 *
 * mode=safe_only  — only green/yellow, no serious alerts (DEFAULT)
 * mode=adventure  — all routes including risky, with warnings
 * mode=available  — only by capacity (ignore risk filter)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawMode = searchParams.get('mode') || 'safe_only';
    const mode = ['safe_only', 'adventure', 'available'].includes(rawMode) ? rawMode : 'safe_only';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const groupSize = parseInt(searchParams.get('group_size') || '1');
    const maxDifficulty = parseInt(searchParams.get('difficulty') || '5');
    const activityType = searchParams.get('activity_type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const params: unknown[] = [groupSize, maxDifficulty, mode, limit];

    let riskFilter = '';
    let activityFilter = '';

    if (mode === 'safe_only') {
      riskFilter = 'AND lrs.alert_severity = 0 AND lrs.is_open = TRUE';
    } else if (mode === 'adventure') {
      riskFilter = '';  // no filter — show everything including dangerous
    } else if (mode === 'available') {
      riskFilter = 'AND lrs.is_open = TRUE';  // only availability
    }

    if (activityType) {
      activityFilter = ` AND ark.activity_type = $${params.length + 1}`;
      params.push(activityType);
    }

    const routes = await query(`
      SELECT
        lrs.agent_route_id,
        ark.title,
        ark.description,
        ark.location_type,
        ark.activity_type,
        ark.lat,
        ark.lng,
        lsp.capacity_per_day,
        lsp.difficulty_level,
        lsp.hazard_types,
        lrs.tourists_today,
        lrs.recommender_status,
        lrs.active_alerts,
        lrs.alert_severity,
        lrs.is_open,
        COALESCE(lsp.capacity_per_day, 50) - COALESCE(lrs.tourists_today, 0) as capacity_remaining,
        COALESCE(lsp.optimal_group_size, 8) as optimal_group_size,
        (
          CASE
            WHEN lrs.is_open = FALSE THEN 0
            WHEN lrs.alert_severity >= 2 AND $3 != 'adventure' THEN 0
            WHEN COALESCE(lsp.capacity_per_day, 50) - COALESCE(lrs.tourists_today, 0) < $1 THEN 0
            WHEN COALESCE(lsp.difficulty_level, 2) > $2 AND $3 = 'safe_only' THEN 0
            ELSE
              (1 - (COALESCE(lrs.tourists_today, 0)::FLOAT / COALESCE(lsp.capacity_per_day, 50))) * 0.5 +
              (1 - (COALESCE(lsp.difficulty_level, 2)::FLOAT / 5)) * 0.3 +
              (1 - (COALESCE(array_length(lrs.active_alerts, 1), 0)::FLOAT / 5)) * 0.2
          END
        ) as safety_score
      FROM location_real_time_status lrs
      LEFT JOIN agent_route_knowledge ark ON lrs.agent_route_id = ark.id
      LEFT JOIN location_safety_profile lsp ON lsp.agent_route_id = lrs.agent_route_id
      WHERE
        COALESCE(lsp.capacity_per_day, 50) - COALESCE(lrs.tourists_today, 0) >= $1
        AND COALESCE(lsp.difficulty_level, 2) <= $2
        ${riskFilter}
        ${activityFilter}
      ORDER BY safety_score DESC
      LIMIT $4
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
      alert_severity: r.alert_severity ?? 0,
      status: r.recommender_status,
      safety_score: r.safety_score,
      is_dangerous: (r.alert_severity ?? 0) >= 2,
      reason:
        !r.is_open
          ? 'Закрыто'
          : (r.alert_severity ?? 0) >= 2
            ? `Риск: ${(r.active_alerts || []).join(', ')}`
            : r.recommender_status === 'yellow'
              ? 'Заполняется, незначительный риск'
              : 'Безопасно и свободно',
    }));

    return Response.json({
      success: true,
      data: recommendations,
      meta: {
        date,
        mode,
        group_size: groupSize,
        total: recommendations.length,
        safe: recommendations.filter((r) => r.alert_severity === 0).length,
        with_warnings: recommendations.filter((r) => r.alert_severity === 1).length,
        dangerous: recommendations.filter((r) => r.alert_severity >= 2).length,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
