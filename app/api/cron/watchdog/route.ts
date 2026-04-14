import { runWatchdog } from '@/lib/agents/watchdog';
import { timingSafeCompare } from '@/lib/security/timing-safe';

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

  try {
    const result = await runWatchdog();
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
