/**
 * POST /api/telegram/register-kuzmich
 * Одноразовая регистрация webhook для Kuzmich-бота.
 * Принимает CRON_SECRET. Удалить после использования.
 */
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const token = process.env.TELEGRAM_KUZMICH_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_KUZMICH_BOT_TOKEN не задан' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
  const webhookUrl = `${appUrl}/api/telegram/kuzmich`;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true, allowed_updates: ['message'] }),
  });
  const data = await res.json() as { ok: boolean; description?: string };

  if (data.ok) {
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: [
        { command: 'start', description: 'Начать разговор с Кузьмичом' },
        { command: 'help',  description: 'Что умеет бот' },
        { command: 'reset', description: 'Сбросить историю' },
      ]}),
    });
  }

  return NextResponse.json({ ok: data.ok, webhookUrl, description: data.description });
}
