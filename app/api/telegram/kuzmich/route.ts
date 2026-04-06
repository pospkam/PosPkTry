/**
 * POST /api/telegram/kuzmich
 * Публичный Telegram-бот Кузьмич — выбор тура + бронирование прямо в чате.
 *
 * Вся логика (booking flow, AI, date parsing) — в lib/kuzmich/core.ts.
 * Этот файл — только Telegram-адаптер (webhook + reply).
 *
 * Если sender == TELEGRAM_OWNER_ID → admin pipeline (PlatformAgent + approve/reject).
 *
 * Env vars: TELEGRAM_KUZMICH_BOT_TOKEN, TELEGRAM_BOT_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { type PendingBooking, cleanupPending, processMessage } from '@/lib/kuzmich/core';
import { PlatformAgent } from '@/lib/agents';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

// ── In-memory state (per-instance, TTL 30 мин) ───────────────────────────────

const pending = new Map<number, PendingBooking>();
setInterval(() => cleanupPending(pending), 5 * 60 * 1000);

// ── Reply helper (отправляет от имени Kuzmich бота) ───────────────────────────

async function tgReply(chatId: number, text: string): Promise<void> {
  // Пробуем оба токена — уведомления могут приходить через любой из ботов
  const token = process.env.TELEGRAM_KUZMICH_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── Owner admin pipeline ──────────────────────────────────────────────────────

/** Обрабатывает /approve_XXXXXXXX и /reject_XXXXXXXX */
async function handleApproval(cmd: string, chatId: number): Promise<void> {
  const isApprove = cmd.startsWith('/approve_');
  const shortId = cmd.replace(/^\/(approve|reject)_/, '');

  if (shortId.length < 7) {
    await tgReply(chatId, 'Неверный формат команды.');
    return;
  }

  try {
    const { rows } = await pool.query<{ id: string; description: string; action_type: string }>(
      `SELECT id, description, action_type
       FROM agent_approvals
       WHERE id LIKE $1 AND status = 'pending'
       LIMIT 1`,
      [shortId + '%']
    );

    if (!rows[0]) {
      await tgReply(chatId, `Инициатива <code>${shortId}</code> не найдена или уже обработана.`);
      return;
    }

    const initiative = rows[0];
    const newStatus = isApprove ? 'approved' : 'rejected';
    const execStatus = isApprove ? 'assigned' : null;

    await pool.query(
      `UPDATE agent_approvals
       SET status = $1,
           execution_status = COALESCE($2, execution_status),
           approved_at = NOW()
       WHERE id = $3`,
      [newStatus, execStatus, initiative.id]
    );

    const emoji = isApprove ? 'Одобрено' : 'Отклонено';
    await tgReply(
      chatId,
      `<b>${emoji}</b>\n\n` +
      `Тип: <code>${initiative.action_type}</code>\n` +
      `${initiative.description}\n\n` +
      (isApprove ? 'Исполнитель получит задачу в ближайший запуск cron (до 1ч).' : 'Инициатива отклонена.')
    );
  } catch (err) {
    await tgReply(chatId, `Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Обрабатывает /kuzmich, /tip, /sezon, /help и т.п. от имени владельца */
async function handleOwnerCommand(cmd: string, chatId: number): Promise<void> {
  switch (cmd) {
    case '/help':
    case '/start':
      await tgReply(chatId, [
        '<b>Кузьмич — Admin режим</b>',
        '',
        '<b>Публикации:</b>',
        '/kuzmich — пост о маршруте в TG + MAX',
        '/tip — совет Кузьмича',
        '/sezon — сезонный пост',
        '',
        '<b>Одобрение инициатив:</b>',
        '/approve_XXXXXXXX — одобрить',
        '/reject_XXXXXXXX — отклонить',
        '',
        '<b>Свободный текст:</b>',
        '"опубликуй пост про рыбалку"',
        '"аудит канала", "последние лиды"',
        '"как поднять конверсию" и т.д.',
      ].join('\n'));
      break;

    case '/kuzmich': {
      await tgReply(chatId, 'Публикую маршрут...');
      const { postKuzmichRoute } = await import('@/lib/notifications/telegram-channel');
      const r = await postKuzmichRoute();
      await tgReply(chatId, r.ok
        ? `Опубликовано${r.routeId ? ` (${r.routeId})` : ''}`
        : `Ошибка: ${r.error ?? 'unknown'}`
      );
      break;
    }

    case '/tip': {
      await tgReply(chatId, 'Публикую совет...');
      const { postKuzmichTip } = await import('@/lib/notifications/telegram-channel');
      const r = await postKuzmichTip();
      await tgReply(chatId, r.ok ? 'Совет опубликован' : `Ошибка: ${r.error ?? 'unknown'}`);
      break;
    }

    case '/sezon': {
      await tgReply(chatId, 'Публикую сезонный пост...');
      const { postSezonToChannel } = await import('@/lib/notifications/telegram-channel');
      const r = await postSezonToChannel();
      await tgReply(chatId, r.ok ? 'Сезонный пост опубликован' : `Ошибка: ${r.error ?? 'unknown'}`);
      break;
    }

    default:
      // Неизвестная команда — пропускаем, обрабатывает PlatformAgent как free text
      await handleOwnerFreeText(cmd, chatId);
  }
}

/** Свободный текст владельца → PlatformAgent */
async function handleOwnerFreeText(text: string, chatId: number): Promise<void> {
  try {
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID ?? '833478813', 10);
    const result = await PlatformAgent.dispatch({
      message: text,
      userId: ownerId,
      role: 'admin',
    });
    await tgReply(chatId, result.response);
  } catch (err) {
    await tgReply(chatId, `Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── POST: Webhook ─────────────────────────────────────────────────────────────

interface TgUpdate {
  message?: { chat: { id: number }; from?: { id: number; first_name?: string }; text?: string };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update = await request.json() as TgUpdate;
    const msg = update.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const fromId = msg.from?.id ?? 0;
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID ?? '833478813', 10);

    // ── Владелец → admin pipeline ──────────────────────────────────────────
    if (fromId === ownerId) {
      const text = msg.text.trim();
      const cmd = text.split(' ')[0]?.toLowerCase() ?? '';

      if (cmd.startsWith('/approve_') || cmd.startsWith('/reject_')) {
        await handleApproval(cmd, chatId);
      } else if (cmd.startsWith('/')) {
        await handleOwnerCommand(cmd, chatId);
      } else {
        await handleOwnerFreeText(text, chatId);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Турист → tourist booking flow ─────────────────────────────────────
    await processMessage({
      chatId,
      text: msg.text.trim(),
      userName: msg.from?.first_name ?? null,
      userId: fromId || null,
      mode: 'tourist',
      createdVia: 'telegram',
      pending,
      reply: tgReply,
    });
  } catch { /* Telegram требует 200 OK всегда */ }

  return NextResponse.json({ ok: true });
}
