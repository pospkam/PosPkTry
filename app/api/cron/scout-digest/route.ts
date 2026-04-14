import { runScoutDigest } from '@/lib/agents/scout-digest';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { logAgentRun } from '@/lib/agents/run-logger';

/**
 * GET /api/cron/scout-digest
 * Ежедневный разведывательный дайджест: RSS → AI-синтез → Telegram.
 * Запускать раз в сутки (утром, ~07:00 UTC).
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

  const started_at = new Date();
  try {
    const result = await runScoutDigest();
    void logAgentRun({
      agent_id: 'scout-digest',
      status: result.digest_sent ? 'success' : 'partial',
      started_at,
      duration_ms: result.duration_ms,
      items_processed: result.signals_found,
    });
    return Response.json({ success: true, ...result });
  } catch (err) {
    void logAgentRun({
      agent_id: 'scout-digest',
      status: 'failed',
      started_at,
      duration_ms: Date.now() - started_at.getTime(),
      errors_count: 1,
      error_msg: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
