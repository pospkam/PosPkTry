/**
 * POST /api/telegram/kuzmich
 * Публичный Telegram-бот Кузьмич — выбор тура + бронирование прямо в чате.
 *
 * Вся логика (booking flow, AI, date parsing) — в lib/kuzmich/core.ts.
 * Этот файл — только Telegram-адаптер (webhook + reply).
 *
 * Если sender == TELEGRAM_OWNER_ID → admin pipeline (PlatformAgent + approve/reject).
 *
 * v2 (апрель 2026): поддержка фото через Gemini Vision
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

// ── Reply helper ──────────────────────────────────────────────────────────────

async function tgReply(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_KUZMICH_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── Photo: скачать файл из Telegram → base64 ─────────────────────────────────

async function downloadTgPhoto(fileId: string): Promise<{ base64: string; mimeType: string } | null> {
  const token = process.env.TELEGRAM_KUZMICH_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    // 1. Получаем путь к файлу
    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    const fileJson = await fileRes.json() as { ok: boolean; result?: { file_path?: string } };
    const filePath = fileJson.result?.file_path;
    if (!filePath) return null;

    // 2. Скачиваем бинарник
    const imgRes = await fetch(
      `https://api.telegram.org/file/bot${token}/${filePath}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!imgRes.ok) return null;

    const buf = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');

    // Определяем тип по расширению (Telegram даёт jpg для фото)
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    };
    const mimeType = mimeMap[ext] ?? 'image/jpeg';

    return { base64, mimeType };
  } catch {
    return null;
  }
}

// ── Owner admin pipeline ──────────────────────────────────────────────────────

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

    if (isApprove) {
      await pool.query(
        `UPDATE agent_approvals
         SET status = 'approved', execution_status = 'assigned',
             reviewed_at = NOW(), review_notes = 'Approved via Telegram bot'
         WHERE id = $1`,
        [initiative.id]
      );
    } else {
      await pool.query(
        `UPDATE agent_approvals
         SET status = 'rejected', reviewed_at = NOW(),
             review_notes = 'Rejected via Telegram bot'
         WHERE id = $1`,
        [initiative.id]
      );
    }

    const label = isApprove ? 'Одобрено' : 'Отклонено';
    await tgReply(
      chatId,
      `<b>${label}</b>\n\nТип: <code>${initiative.action_type}</code>\n${initiative.description}\n\n` +
      (isApprove ? 'Исполнитель получит задачу в ближайший cron (до 1ч).' : 'Инициатива отклонена.')
    );
  } catch (err) {
    await tgReply(chatId, `Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleOwnerCommand(cmd: string, chatId: number): Promise<void> {
  switch (cmd) {
    case '/help':
    case '/start':
      await tgReply(chatId, [
        '<b>Кузьмич — Admin режим</b>',
        '',
        '/kuzmich — пост о маршруте',
        '/tip — совет Кузьмича',
        '/sezon — сезонный пост',
        '',
        '/approve_XXXXXXXX — одобрить инициативу',
        '/reject_XXXXXXXX — отклонить',
      ].join('\n'));
      break;

    case '/kuzmich': {
      await tgReply(chatId, 'Публикую маршрут...');
      const { postKuzmichRoute } = await import('@/lib/notifications/telegram-channel');
      const r = await postKuzmichRoute();
      await tgReply(chatId, r.ok ? `Опубликовано${r.routeId ? ` (${r.routeId})` : ''}` : `Ошибка: ${r.error ?? 'unknown'}`);
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
      await handleOwnerFreeText(cmd, chatId);
  }
}

async function handleOwnerFreeText(text: string, chatId: number): Promise<void> {
  try {
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID ?? '833478813', 10);
    const result = await PlatformAgent.dispatch({ message: text, userId: ownerId, role: 'admin' });
    await tgReply(chatId, result.response);
  } catch (err) {
    await tgReply(chatId, `Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── POST: Webhook ─────────────────────────────────────────────────────────────

interface TgPhotoSize {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TgUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string };
    text?: string;
    caption?: string;          // подпись к фото
    photo?: TgPhotoSize[];     // массив размеров (от маленького к большому)
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update = await request.json() as TgUpdate;
    const msg = update.message;
    if (!msg) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const fromId = msg.from?.id ?? 0;
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID ?? '833478813', 10);

    // ── Владелец → admin pipeline ──────────────────────────────────────────
    if (fromId === ownerId && msg.text) {
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

    // ── Турист с фото ──────────────────────────────────────────────────────
    if (msg.photo?.length) {
      // Берём наибольшее фото (последнее в массиве)
      const bestPhoto = msg.photo[msg.photo.length - 1];
      const caption = msg.caption?.trim() ?? '';

      await tgReply(chatId, 'Смотрю на фото...');

      let visionDescription: string | undefined;
      try {
        const photoData = await downloadTgPhoto(bestPhoto.file_id);
        if (photoData) {
          const { callGeminiVision } = await import('@/lib/ai/providers');
          visionDescription = await callGeminiVision(
            photoData.base64,
            photoData.mimeType,
            'Опиши что на фото: место, природа, деятельность. Если это Камчатка — укажи конкретно что это (вулкан, река, море и т.д.). Кратко, 2-3 предложения.',
          ) ?? undefined;
        }
      } catch { /* vision не критичен */ }

      if (!visionDescription) {
        visionDescription = 'Не удалось распознать фото';
      }

      await processMessage({
        chatId,
        text: caption || 'Что это за место?',
        userName: msg.from?.first_name ?? null,
        userId: fromId || null,
        mode: 'tourist',
        createdVia: 'telegram',
        pending,
        reply: tgReply,
        visionDescription,
      });
      return NextResponse.json({ ok: true });
    }

    // ── Турист → текст ─────────────────────────────────────────────────────
    if (!msg.text) return NextResponse.json({ ok: true });

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
