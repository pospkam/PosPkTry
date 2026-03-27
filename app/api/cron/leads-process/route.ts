/**
 * GET /api/cron/leads-process
 * Обрабатывает новые лиды которые не получили AI-обработку (слетели, ошибки).
 *
 * Запуск: cron-job.org каждые 30 минут
 *   URL: https://tourhab.ru/api/cron/leads-process?secret=<CRON_SECRET>
 *
 * Выбирает: статус 'new', старше 2 минут (чтобы авто-триггер из POST уже отработал), макс 10 за раз
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { leadProcessor } from '@/lib/services/lead-processor.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!timingSafeCompare(secret, cronSecret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Лиды 'new' старше 2 минут, без processed_at, с достаточным качеством
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM leads
     WHERE status = 'new'
       AND created_at < NOW() - INTERVAL '2 minutes'
       AND processed_at IS NULL
       AND (ai_score IS NULL OR ai_score >= 30)
     ORDER BY created_at ASC
     LIMIT 10`
  );

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Нет необработанных лидов' });
  }

  const results: { id: string; name: string; ok: boolean; error?: string }[] = [];

  for (const lead of rows) {
    try {
      await leadProcessor.process(lead.id);
      results.push({ id: lead.id, name: lead.name, ok: true });
    } catch (err) {
      results.push({
        id: lead.id,
        name: lead.name,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const processed = results.filter(r => r.ok).length;
  const failed    = results.filter(r => !r.ok).length;

  return NextResponse.json({ ok: true, processed, failed, results });
}
