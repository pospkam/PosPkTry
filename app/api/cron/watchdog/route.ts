import { runWatchdog } from '@/lib/agents/watchdog';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { logAgentRun } from '@/lib/agents/run-logger';

/**
 * GET /api/cron/watchdog
 * Мониторинг платформы: бронирования, операторы, лиды, SOS.
 * Запускать каждые 30 минут.
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
    const result = await runWatchdog();
    void logAgentRun({
      agent_id: 'watchdog',
      status: 'success',
      started_at,
      duration_ms: Date.now() - started_at.getTime(),
      metadata: result as unknown as Record<string, unknown>,
    });
    return Response.json({ success: true, ...result });
  } catch (err) {
    void logAgentRun({
      agent_id: 'watchdog',
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
