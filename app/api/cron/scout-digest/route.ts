import { runScoutDigest } from '@/lib/agents/scout-digest';
import { timingSafeCompare } from '@/lib/security/timing-safe';

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

  try {
    const result = await runScoutDigest();
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
