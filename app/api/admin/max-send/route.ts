/**
 * POST /api/admin/max-send
 *
 * Отправить произвольный текст в MAX конкретному пользователю по chat_id.
 * Защита: CRON_SECRET в заголовке Authorization.
 *
 * Body: { chat_id: number, text: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Bot } from '@maxhub/max-bot-api';

export const dynamic = 'force-dynamic';

function getApi() {
  const token = process.env.MAX_BOT_TOKEN;
  if (!token) return null;
  return new Bot(token).api;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chat_id, text } = await req.json() as { chat_id: number; text: string };
  if (!chat_id || !text) {
    return NextResponse.json({ error: 'chat_id and text required' }, { status: 400 });
  }

  const api = getApi();
  if (!api) {
    return NextResponse.json({ error: 'MAX_BOT_TOKEN not set' }, { status: 500 });
  }

  // Разбиваем на чанки по 4000 символов (лимит MAX)
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 4000) {
    chunks.push(text.slice(i, i + 4000));
  }

  const errors: string[] = [];
  for (const chunk of chunks) {
    try {
      await api.sendMessageToChat(chat_id, chunk, { format: 'html' });
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'error');
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    sent: chunks.length - errors.length,
    total: chunks.length,
    errors: errors.length ? errors : undefined,
  });
}
