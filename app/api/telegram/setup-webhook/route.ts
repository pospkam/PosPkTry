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
  const cronSecret = request.headers.get('x-cron-secret');
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;
  }

  let body: { appUrl?: string; bot?: 'main' | 'admin' | 'kuzmich' } = {};
  try {
    body = await request.json();
  } catch { /* тело необязательно */ }

  const botType = body.bot ?? 'main';
  const botTokenMap: Record<string, string | undefined> = {
    main:    process.env.TELEGRAM_BOT_TOKEN,
    admin:   process.env.TELEGRAM_ADMIN_BOT_TOKEN,
    kuzmich: process.env.TELEGRAM_KUZMICH_BOT_TOKEN,
  };
  const webhookPathMap: Record<string, string> = {
    main:    '/api/telegram/webhook',
    admin:   '/api/telegram/admin',
    kuzmich: '/api/telegram/kuzmich',
  };

  const botToken = botTokenMap[botType];
  if (!botToken) {
    return NextResponse.json({ success: false, error: `Токен для бота «${botType}» не задан` }, { status: 500 });
  }

  const appUrl = body.appUrl
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://tourhab.ru';

  const webhookPath = webhookPathMap[botType] ?? '/api/telegram/webhook';
  const webhookUrl = `${appUrl}${webhookPath}`;
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

  // Регистрируем команды
  if (botType === 'kuzmich') {
    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Начать разговор с Кузьмичом' },
          { command: 'help',  description: 'Что умеет этот бот' },
          { command: 'reset', description: 'Очистить историю разговора' },
        ],
      }),
    });
  }

  if (botType === 'main') {
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
  }

  return NextResponse.json({
    success: true,
    webhookUrl,
    bot: botType,
    message: data.description || 'Webhook установлен',
  });
}
