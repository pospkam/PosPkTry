/**
 * GET /api/cron/board-meeting
 *
 * Автоматический запуск заседания совета директоров по расписанию.
 * Запускается через cron-job.org 1 раз в день в 08:00 KMT (23:00 UTC).
 *
 *   URL: https://tourhab.ru/api/cron/board-meeting?secret=<CRON_SECRET>
 *
 * Что делает:
 *   1. Запускает полное совещание (4 раунда) через внутренний вызов
 *   2. Все агенты (включая AI Разведчик) генерируют отчёты и инициативы
 *   3. Безопасные инициативы исполняются автоматически
 *   4. Отправляет Telegram-уведомление о старте
 *   5. Возвращает 200 сразу — совещание идёт в фоне
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic     = 'force-dynamic';
export const maxDuration = 30;

async function tgAlert(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

export async function GET(req: NextRequest) {
  const secret     = req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const provided = authHeader?.replace('Bearer ', '').trim() ?? secret ?? '';
  if (provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://pospkam-pospktry-c1f3.twc1.net';

  // Fire-and-forget — не блокируем cron-ответ, совещание идёт в фоне (до 5 мин)
  fetch(`${baseUrl}/api/agents/board-meeting`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cron-Secret': cronSecret,
    },
    body: JSON.stringify({ topic: null }),
  }).catch(() => null);

  await tgAlert(
    '<b>Совет директоров</b> — автозапуск\n\n' +
    'Заседание начато по расписанию. 13 агентов готовят отчёты.\n' +
    'Безопасные инициативы исполнятся автоматически.\n\n' +
    '<a href="https://tourhab.ru/hub/admin/board-meeting">Открыть совещание</a>'
  );

  return NextResponse.json({
    success: true,
    message: 'Board meeting started in background',
    timestamp: new Date().toISOString(),
  });
}
