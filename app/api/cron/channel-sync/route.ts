/**
 * GET /api/cron/channel-sync?secret=...
 * Синхронизирует заказы с внешних маркетплейсов (Tripster, Авито, Sputnik8)
 * Запускать каждые 30 минут
 */

import { syncAllChannels } from '@/lib/channels/channel-manager';
import { timingSafeCompare } from '@/lib/security/timing-safe';

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret');
  if (!process.env.CRON_SECRET) return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!timingSafeCompare(secret, process.env.CRON_SECRET)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const started = Date.now();

  try {
    const results = await syncAllChannels();
    const totalNew = results.reduce((s, r) => s + r.new_orders, 0);
    const allErrors = results.flatMap(r => r.errors);

    return Response.json({
      success: true,
      duration_ms: Date.now() - started,
      total_new_orders: totalNew,
      channels: results,
      errors: allErrors.length ? allErrors : undefined,
    });
  } catch (e) {
    return Response.json(
      { success: false, error: (e as Error).message, duration_ms: Date.now() - started },
      { status: 500 }
    );
  }
}
