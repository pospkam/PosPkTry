import { ingestAll } from '@/lib/services/seismic-parser';
import { query } from '@/lib/database';
import { timingSafeCompare } from '@/lib/security/timing-safe';

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
  if (!timingSafeCompare(secret, cronSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const errors: string[] = [];
  let realTimeUpdated = 0;

  // ── 1. Парсим КБГС РАН + eqkam ───────────────────────────────────────
  const ingestResult = await ingestAll();
  errors.push(...ingestResult.kbgsras.errors, ...ingestResult.eqkam.errors);

  // ── 2. Обновляем location_real_time_status (zone-aware) ──────
  // Алерты привязываются к маршрутам через зоны (affected_zones)
  // Маршрут получает только алерты из СВОЕЙ зоны, а не глобальные
  try {
    const updateResult = await query(`
      UPDATE location_real_time_status lrs
      SET
        active_alerts = (
          SELECT COALESCE(array_agg(ea.title), '{}')
          FROM external_alerts ea
          LEFT JOIN agent_route_knowledge ark ON ark.id = lrs.agent_route_id
          WHERE ea.expires_at > NOW()
            AND (
              ea.affected_zones IS NULL
              OR ea.affected_zones = '{}'
              OR ark.zone = ANY(ea.affected_zones)
            )
        ),
        alert_severity = (
          SELECT COALESCE(MAX(ea.severity), 0)
          FROM external_alerts ea
          LEFT JOIN agent_route_knowledge ark ON ark.id = lrs.agent_route_id
          WHERE ea.expires_at > NOW()
            AND (
              ea.affected_zones IS NULL
              OR ea.affected_zones = '{}'
              OR ark.zone = ANY(ea.affected_zones)
            )
        ),
        recommender_status = CASE
          WHEN (
            SELECT COALESCE(MAX(ea.severity), 0)
            FROM external_alerts ea
            LEFT JOIN agent_route_knowledge ark ON ark.id = lrs.agent_route_id
            WHERE ea.expires_at > NOW()
              AND (
                ea.affected_zones IS NULL
                OR ea.affected_zones = '{}'
                OR ark.zone = ANY(ea.affected_zones)
              )
          ) >= 2 THEN 'red'
          WHEN lrs.tourists_today >= COALESCE(
            (SELECT capacity_per_day FROM location_safety_profile WHERE agent_route_id = lrs.agent_route_id),
            50
          ) THEN 'red'
          WHEN lrs.tourists_today >= COALESCE(
            (SELECT ROUND(capacity_per_day * 0.7) FROM location_safety_profile WHERE agent_route_id = lrs.agent_route_id),
            35
          ) THEN 'yellow'
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
