import { runDangerAnalysis } from '@/lib/agents/agencies/danger-analyst-agency';
import { timingSafeCompare } from '@/lib/security/timing-safe';

/**
 * GET /api/cron/danger-analysis
 * Запускает AI-анализ опасностей по всем зонам Камчатки
 * Сохраняет в danger_assessments
 * Запускать каждые 30 минут (после safety-ingest)
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

  try {
    const result = await runDangerAnalysis();

    return Response.json({
      success: true,
      duration_ms: Date.now() - startedAt,
      zones_analyzed: result.assessments.length,
      high_risk_zones: result.high_risk_zones,
      total_tourists_at_risk: result.total_tourists_at_risk,
      assessments: result.assessments.map(a => ({
        zone: a.zone,
        risk_score: a.risk_score,
        risk_level: a.risk_level,
        recommended_action: a.recommended_action,
        tourists_at_risk: a.tourists_at_risk,
      })),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message, duration_ms: Date.now() - startedAt },
      { status: 500 }
    );
  }
}
