/**
 * GET  /api/telegram/register-kuzmich?secret=CRON_SECRET
 * POST /api/telegram/register-kuzmich
 *
 * Регистрирует webhook Kuzmich-бота на /api/telegram/kuzmich.
 * Использует TELEGRAM_KUZMICH_BOT_TOKEN, fallback → TELEGRAM_BOT_TOKEN.
 */
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

async function registerWebhook(token: string, appUrl: string) {
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
        { command: 'start',   description: 'Начать' },
        { command: 'help',    description: 'Что умеет бот' },
        { command: 'reset',   description: 'Сбросить историю' },
        { command: 'kuzmich', description: 'Опубликовать пост о маршруте' },
        { command: 'tip',     description: 'Опубликовать совет Кузьмича' },
        { command: 'sezon',   description: 'Опубликовать сезонный пост' },
      ]}),
    });
  }

  return { ok: data.ok, webhookUrl, description: data.description };
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const token = process.env.TELEGRAM_KUZMICH_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не задан на Timeweb' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
  const result = await registerWebhook(token, appUrl);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { token?: string } = {};
  try { body = await request.clone().json(); } catch { /* нет тела */ }

  const token = process.env.TELEGRAM_KUZMICH_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN ?? body.token;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не задан', hint: 'Задай на Timeweb' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
  const result = await registerWebhook(token, appUrl);
  return NextResponse.json(result);
}
