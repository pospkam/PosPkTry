/**
 * POST /api/bots/reposter/setup
 *
 * Регистрирует Telegram webhook для репостера.
 * Вызывается один раз после деплоя.
 * Требует роль admin.
 *
 * Env: REPOSTER_TG_BOT_TOKEN, REPOSTER_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const token = process.env.REPOSTER_TG_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'REPOSTER_TG_BOT_TOKEN не задан' },
      { status: 500 },
    );
  }

  const host = req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const webhookUrl = `${proto}://${host}/api/bots/reposter/webhook`;
  const secret = process.env.REPOSTER_WEBHOOK_SECRET ?? '';

  try {
    const body: Record<string, unknown> = {
      url: webhookUrl,
      // Разрешаем только channel_post апдейты — игнорируем лишний трафик
      allowed_updates: ['channel_post'],
      drop_pending_updates: true,
    };
    if (secret) body.secret_token = secret;

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };

    if (!data.ok) {
      return NextResponse.json(
        { success: false, error: data.description ?? 'Telegram API error' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      webhookUrl,
      message: 'Webhook зарегистрирован. Бот готов репостить.',
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/bots/reposter/setup
 * Проверить статус текущего webhook.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const token = process.env.REPOSTER_TG_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ success: false, error: 'REPOSTER_TG_BOT_TOKEN не задан' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    return NextResponse.json({ success: true, info: data.result });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
