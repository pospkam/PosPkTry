/**
 * GET /api/admin/telegram/test
 *
 * Диагностика Telegram уведомлений:
 *   - показывает какие env vars настроены
 *   - отправляет тест сообщение в TELEGRAM_CHAT_ID
 *   - возвращает ответ Telegram API (ok/error)
 *
 * Защита: requireAdmin
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError instanceof NextResponse) return authError;

  const token     = process.env.TELEGRAM_BOT_TOKEN;
  const chatId    = process.env.TELEGRAM_CHAT_ID;
  const leadsChatId = process.env.TELEGRAM_LEADS_CHAT_ID;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  const config = {
    TELEGRAM_BOT_TOKEN:    token    ? `set (…${token.slice(-6)})`    : 'NOT SET',
    TELEGRAM_CHAT_ID:      chatId   ?? 'NOT SET',
    TELEGRAM_LEADS_CHAT_ID: leadsChatId ?? 'NOT SET (необязательно)',
    TELEGRAM_CHANNEL_ID:   channelId ?? 'NOT SET',
  };

  if (!token) {
    return NextResponse.json({ ok: false, config, error: 'TELEGRAM_BOT_TOKEN не задан — все уведомления отключены' });
  }

  if (!chatId) {
    return NextResponse.json({ ok: false, config, error: 'TELEGRAM_CHAT_ID не задан — admin-уведомления о лидах не придут' });
  }

  // Тест: getMe
  let botInfo: unknown = null;
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    botInfo = await meRes.json();
  } catch (e) {
    return NextResponse.json({ ok: false, config, error: `Не удалось достучаться до Telegram API: ${String(e)}` });
  }

  // Тест: sendMessage в TELEGRAM_CHAT_ID
  const testText = `✅ <b>TourHab — тест уведомлений</b>\n\nЕсли видишь это — Telegram-уведомления о лидах работают.\n\n<code>${new Date().toISOString()}</code>`;
  let sendResult: unknown = null;
  try {
    const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: testText, parse_mode: 'HTML' }),
    });
    sendResult = await sendRes.json();
  } catch (e) {
    return NextResponse.json({ ok: false, config, botInfo, error: `sendMessage failed: ${String(e)}` });
  }

  return NextResponse.json({ ok: true, config, botInfo, sendResult });
}
