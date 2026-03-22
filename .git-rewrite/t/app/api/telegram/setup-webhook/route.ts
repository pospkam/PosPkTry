/**
 * POST /api/telegram/setup-webhook
 * Регистрирует webhook URL в Telegram (одноразовая настройка).
 * AUTH: только admin
 *
 * Telegram будет отправлять POST-запросы на:
 *   https://<APP_URL>/api/telegram/webhook
 *
 * Запрос: { appUrl?: string }  — если пусто, берётся из NEXT_PUBLIC_APP_URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  const adminOrResponse = await requireAdmin(request);
  if (adminOrResponse instanceof NextResponse) return adminOrResponse;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN не задан' }, { status: 500 });
  }

  let body: { appUrl?: string } = {};
  try {
    body = await request.json();
  } catch { /* тело необязательно */ }

  const appUrl = body.appUrl
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://tourhab.ru';

  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    }
  );

  const data = await res.json();

  if (!data.ok) {
    return NextResponse.json({
      success: false,
      error: data.description || 'Ошибка установки webhook',
      webhookUrl,
    }, { status: 400 });
  }

  // Регистрируем команды в меню бота
  await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start',  description: 'Познакомиться с Кузьмичем' },
        { command: 'route',  description: 'Случайный маршрут из каталога' },
        { command: 'sezon',  description: 'Совет на текущий сезон' },
        { command: 'help',   description: 'Список команд' },
      ],
    }),
  });

  return NextResponse.json({
    success: true,
    webhookUrl,
    message: data.description || 'Webhook установлен, команды зарегистрированы',
  });
}
