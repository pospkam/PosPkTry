import { runEditor } from '@/lib/agents/editor';

/**
 * GET /api/cron/editor
 * AI-редактор описаний туров: находит туры с короткими описаниями,
 * переписывает через AI, сохраняет в route_description_cache.
 * Запускать раз в сутки (ночью, ~02:00 UTC).
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

  try {
    const result = await runEditor();
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
