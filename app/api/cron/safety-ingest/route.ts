import { ingestAll } from '@/lib/services/seismic-parser';
import { query } from '@/lib/database';

/**
 * POST /api/cron/safety-ingest
 * Парсит данные КБГС РАН (t.me/s/kbgsras, t.me/s/eqkam)
 * Сохраняет в external_alerts, обновляет location_real_time_status
 * Запускать каждые 15-30 минут
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (secret !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const errors: string[] = [];
  let realTimeUpdated = 0;

  // ── 1. Парсим КБГС РАН + eqkam ───────────────────────────────────────
  const ingestResult = await ingestAll();
  errors.push(...ingestResult.kbgsras.errors, ...ingestResult.eqkam.errors);

  // ── 2. Обновляем location_real_time_status по активным алертам ────────
  try {
    const updateResult = await query(`
      UPDATE location_real_time_status lrs
      SET
        active_alerts = (
          SELECT array_agg(DISTINCT ea.title)
          FROM external_alerts ea
          WHERE ea.expires_at > NOW()
            AND (
              ea.affected_locations @> ARRAY[lrs.agent_route_id]
              OR ea.affected_zones && (
                SELECT ARRAY[COALESCE(ark.zone, 'avachinsky')]
                FROM agent_route_knowledge ark
                WHERE ark.id = lrs.agent_route_id
                LIMIT 1
              )
            )
        ),
        alert_severity = COALESCE((
          SELECT MAX(ea.severity)
          FROM external_alerts ea
          WHERE ea.expires_at > NOW()
            AND (
              ea.affected_locations @> ARRAY[lrs.agent_route_id]
              OR ea.affected_zones && (
                SELECT ARRAY[COALESCE(ark.zone, 'avachinsky')]
                FROM agent_route_knowledge ark
                WHERE ark.id = lrs.agent_route_id
                LIMIT 1
              )
            )
        ), 0),
        recommender_status = CASE
          WHEN COALESCE((
            SELECT MAX(ea.severity)
            FROM external_alerts ea
            WHERE ea.expires_at > NOW()
              AND (
                ea.affected_locations @> ARRAY[lrs.agent_route_id]
                OR ea.affected_zones && (
                  SELECT ARRAY[COALESCE(ark.zone, 'avachinsky')]
                  FROM agent_route_knowledge ark
                  WHERE ark.id = lrs.agent_route_id
                  LIMIT 1
                )
              )
          ), 0) >= 2 THEN 'red'
          WHEN lrs.tourists_today >= COALESCE((
            SELECT capacity_per_day
            FROM location_safety_profile
            WHERE agent_route_id = lrs.agent_route_id
          ), 50) THEN 'red'
          WHEN lrs.tourists_today >= COALESCE((
            SELECT capacity_per_day * 0.7
            FROM location_safety_profile
            WHERE agent_route_id = lrs.agent_route_id
          ), 35) THEN 'yellow'
          ELSE 'green'
        END,
        updated_at = NOW()
    `);
    realTimeUpdated = updateResult.rowCount ?? 0;
  } catch (e) {
    errors.push(`real-time update failed: ${(e as Error).message}`);
  }

  const durationMs = Date.now() - startedAt;

  return Response.json({
    success: true,
    duration_ms: durationMs,
    kbgsras: {
      events_found: ingestResult.kbgsras.events.length,
      inserted: ingestResult.kbgsras.inserted,
      skipped: ingestResult.kbgsras.skipped,
    },
    eqkam: {
      events_found: ingestResult.eqkam.events.length,
      inserted: ingestResult.eqkam.inserted,
      skipped: ingestResult.eqkam.skipped,
    },
    total_inserted: ingestResult.total_inserted,
    real_time_updated: realTimeUpdated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
