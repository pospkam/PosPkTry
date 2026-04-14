/**
 * POST /api/telegram/kuzmich
 *
 * Многофункциональный Telegram-бот Кузьмич:
 * - Личные чаты: полный функционал (гид, бронирование, SOS, голос, фото)
 * - Групповые чаты: парсер лидов — молчит, пока не услышит туристический запрос
 * - Владелец: admin pipeline (PlatformAgent + approve/reject)
 *
 * v3 (апрель 2026):
 *  - Голосовые сообщения → Gemini transcription
 *  - Группы → group_listener mode
 *  - callback_query → рейтинги 👍/👎
 *  - Регистрация группы оператора: /register_group
 */

import { NextRequest, NextResponse } from 'next/server';
import { type PendingBooking, cleanupPending, processMessage, isBookingTrigger } from '@/lib/kuzmich/core';
import { findOperatorByChatId, processOperatorMessage, registerOperatorChatId } from '@/lib/kuzmich/operator-chat';
import { PlatformAgent } from '@/lib/agents';
import { pool } from '@/lib/db-pool';
import { groupMonitor } from '@/lib/telegram/group-monitor';

export const dynamic = 'force-dynamic';

// ── In-memory state ───────────────────────────────────────────────────────────

const pending = new Map<number, PendingBooking>();
setInterval(() => cleanupPending(pending), 5 * 60 * 1000);

// ── Helpers ───────────────────────────────────────────────────────────────────

function botToken() {
  return process.env.TELEGRAM_KUZMICH_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN ?? '';
}

/** Strip emoji codepoints (emoticons, symbols, flags, etc.) */
function stripEmoji(s: string): string {
  return s.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\s{2,}/g, ' ');
}

/** Convert leftover markdown to Telegram-safe HTML, strip unsupported syntax */
function sanitizeForTelegram(raw: string): string {
  let t = raw;
  // **bold** or __bold__ → <b>bold</b>
  t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  t = t.replace(/__(.+?)__/g, '<b>$1</b>');
  // *italic* → <i>italic</i> (but not bullet-list asterisks)
  t = t.replace(/(?<!\n)\*(?!\s)(.+?)(?<!\s)\*/g, '<i>$1</i>');
  // Remove leftover markdown artifacts: # headers, * bullet, ``` code blocks
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/^[\*\-]\s+/gm, '- ');
  t = t.replace(/```[\s\S]*?```/g, '');
  // Strip emojis
  t = stripEmoji(t);
  return t.trim();
}

async function tgReply(chatId: number, text: string, extra?: Record<string, unknown>): Promise<void> {
  const token = botToken();
  if (!token) return;
  const clean = sanitizeForTelegram(text);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const base = { chat_id: chatId, disable_web_page_preview: true, ...extra };

  // Attempt 1: HTML
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...base, text: clean, parse_mode: 'HTML' }),
    });
    const json = await res.json() as { ok: boolean; description?: string };
    if (json.ok) return;

    // Attempt 2: plain text fallback (strip all HTML tags)
    const plain = clean.replace(/<[^>]+>/g, '');
    const res2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...base, text: plain }),
    });
    const json2 = await res2.json() as { ok: boolean; description?: string };
    if (!json2.ok) {
      console.error('[tgReply] fallback failed:', json2.description);
    }
  } catch (err) {
    console.error('[tgReply] network error:', err instanceof Error ? err.message : err);
  }
}

async function tgAnswerCallback(callbackQueryId: string, text?: string): Promise<void> {
  const token = botToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  }).catch(() => {});
}

// ── /start с клавиатурой быстрых тем ──────────────────────────────────────────

async function sendStartMessage(chatId: number, name: string | null): Promise<void> {
  const greeting = name ? `Привет, ${name}!` : 'Привет!';
  const text = [
    `${greeting} Я Кузьмич — AI-агент платформы TourHab.`,
    '',
    '<b>Что умею:</b>',
    '- Подобрать тур: рыбалка, вулканы, медведи, термальные источники...',
    '- Открыть заявку на тур прямо в чате',
    '- Рассказать про маршруты, сезоны, снаряжение',
    '- Предупредить об опасностях на маршруте',
    '- Определить место по фото',
    '',
    'Выбери тему или пиши своими словами.',
  ].join('\n');

  await tgReply(chatId, text, {
    reply_markup: {
      keyboard: [
        ['Рыбалка', 'Вулканы'],
        ['Медведи', 'Термальные источники'],
        ['Вертолётный тур', 'Помощь'],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

/** Heuristic: answer looks like a concrete tour description (recommends something specific) */
function hasTourRecommendation(answer: string): boolean {
  const t = answer.toLowerCase();
  const hasTourWord = /\bтур\b|маршрут|рыбалк|вулкан|медвед|термал|гейзер|восхожден|экскурс/.test(t);
  const hasDetail = /\d+[\s\u00a0]*(р|руб|₽|ч\b|час|дн|день|дней|км|чел)/.test(t) || t.includes('стоимость') || t.includes('цена') || t.includes('от ') || t.includes('забронир');
  return hasTourWord && hasDetail && answer.length > 120;
}

async function sendBookingInlineButton(chatId: number): Promise<void> {
  const token = botToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: 'Хотите оформить заявку на тур?',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Хочу забронировать', callback_data: 'book_now' },
        ]],
      },
    }),
  }).catch(() => {});
}

async function afterAiReply(chatId: number, answer?: string): Promise<void> {
  if (answer && hasTourRecommendation(answer)) {
    await sendBookingInlineButton(chatId);
  }
}

// ── Скачать файл из Telegram → base64 ────────────────────────────────────────

async function downloadTgFile(fileId: string): Promise<{ base64: string; mimeType: string; ext: string } | null> {
  const token = botToken();
  if (!token) return null;
  try {
    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    const fileJson = await fileRes.json() as { ok: boolean; result?: { file_path?: string } };
    const filePath = fileJson.result?.file_path;
    if (!filePath) return null;

    const imgRes = await fetch(
      `https://api.telegram.org/file/bot${token}/${filePath}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!imgRes.ok) return null;

    const buf = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'bin';

    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp',
      ogg: 'audio/ogg', oga: 'audio/ogg', mp3: 'audio/mp3',
      m4a: 'audio/m4a', wav: 'audio/wav',
    };
    return { base64, mimeType: mimeMap[ext] ?? 'application/octet-stream', ext };
  } catch { return null; }
}

// ── Owner admin pipeline ──────────────────────────────────────────────────────

async function handleApproval(cmd: string, chatId: number): Promise<void> {
  const isApprove = cmd.startsWith('/approve_');
  const shortId = cmd.replace(/^\/(approve|reject)_/, '');
  if (shortId.length < 7) { await tgReply(chatId, 'Неверный формат.'); return; }

  try {
    const { rows } = await pool.query<{ id: string; description: string; action_type: string }>(
      `SELECT id, description, action_type FROM agent_approvals WHERE id LIKE $1 AND status = 'pending' LIMIT 1`,
      [shortId + '%'],
    );
    if (!rows[0]) { await tgReply(chatId, `Инициатива <code>${shortId}</code> не найдена.`); return; }
    const { id, description, action_type } = rows[0];

    await pool.query(
      `UPDATE agent_approvals SET status = $1, execution_status = $2, reviewed_at = NOW(),
       review_notes = $3 WHERE id = $4`,
      [isApprove ? 'approved' : 'rejected',
       isApprove ? 'assigned' : 'rejected',
       `${isApprove ? 'Approved' : 'Rejected'} via Telegram bot`,
       id],
    );
    await tgReply(chatId,
      `<b>${isApprove ? 'Одобрено' : 'Отклонено'}</b>\n\nТип: <code>${action_type}</code>\n${description}`
    );
  } catch (err) {
    await tgReply(chatId, `Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleOwnerCommand(cmd: string, text: string, chatId: number): Promise<void> {
  if (cmd === '/help' || cmd === '/start') {
    await tgReply(chatId, '<b>Admin режим</b>\n\n/kuzmich — пост о маршруте\n/tip — совет\n/sezon — сезонный пост\n/safety — пост о безопасности\n/approve_XXX / /reject_XXX — инициативы');
    return;
  }
  if (cmd === '/kuzmich' || cmd === '/tip' || cmd === '/sezon' || cmd === '/safety') {
    await tgReply(chatId, 'Публикую...');
    const mod = await import('@/lib/notifications/telegram-channel');
    const fn = cmd === '/kuzmich' ? mod.postKuzmichRoute
      : cmd === '/tip' ? mod.postKuzmichTip
      : cmd === '/safety' ? mod.postSafetyToChannel
      : mod.postSezonToChannel;
    const topic = cmd === '/safety' ? text.replace(/^\/safety\s*/i, '').trim() || undefined : undefined;
    const r = cmd === '/safety' ? await fn(topic) : await fn();
    await tgReply(chatId, r.ok ? 'Опубликовано' : `Ошибка: ${r.error}`);
    return;
  }
  // Free text → PlatformAgent
  try {
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID ?? '0', 10);
    const result = await PlatformAgent.dispatch({ message: text, userId: ownerId, role: 'admin' });
    await tgReply(chatId, result.response);
  } catch (err) {
    await tgReply(chatId, `Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── Рейтинг: сохранить в БД ───────────────────────────────────────────────────

async function saveRating(chatId: number, mode: string, rating: 1 | 5): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO tg_ratings (chat_id, mode, rating) VALUES ($1, $2, $3)`,
      [chatId, mode, rating],
    );
  } catch { /* не критично */ }
}

// ── Парсер лидов (групповой чат) ─────────────────────────────────────────────

const GROUP_TRIGGERS = [
  'хочу', 'хотим', 'сколько стоит', 'можно', 'есть ли', 'когда', 'как попасть',
  'интересует', 'рыбалк', 'вулкан', 'медвед', 'термал', 'вертолет', 'снегоход',
  'тур', 'экскурс', 'бронир', 'цена', 'стоимость',
  'want', 'how much', 'price', 'book', 'tour', 'fishing', 'volcano',
];

function hasTouristIntent(text: string): boolean {
  const t = text.toLowerCase();
  return GROUP_TRIGGERS.some(tr => t.includes(tr));
}

async function processGroupMessage(opts: {
  chatId: number;
  fromId: number;
  fromName: string | null;
  text: string;
}): Promise<void> {
  const { chatId, fromId, fromName, text } = opts;

  if (!hasTouristIntent(text)) return; // молчим

  // Краткий AI-ответ в группе
  const { buildTourContext, KUZMICH_SYSTEM } = await import('@/lib/kuzmich/core');
  const { callAIWaterfall } = await import('@/lib/ai/providers');

  const tourCtx = await buildTourContext();
  const systemContent = `${KUZMICH_SYSTEM}\n\n${tourCtx}\n\nТы в групповом чате. Отвечай коротко (2-3 строки). Для бронирования приглашай писать в личку боту.`;

  const messages = [
    { role: 'system' as const, content: systemContent },
    { role: 'user' as const, content: text },
  ];

  const answer = await callAIWaterfall(messages);
  const botUsername = process.env.TELEGRAM_KUZMICH_USERNAME ?? 'tourhab_bot';
  const reply = (answer?.trim() || 'Напишите мне в личку — подберу тур!') +
    `\n\n<a href="https://t.me/${botUsername}">Написать Кузьмичу →</a>`;

  await tgReply(chatId, reply);

  // Уведомление о лиде оператору группы или платформе
  const operatorTgId = await getGroupOperatorId(chatId);
  const notifyId = operatorTgId ?? parseInt(process.env.TELEGRAM_OWNER_ID ?? '0', 10);

  if (notifyId) {
    const leadText = [
      '<b>Новый лид из группы</b>',
      `Имя: ${fromName ?? 'неизвестно'} (ID: ${fromId})`,
      `Запрос: ${text.slice(0, 200)}`,
      `Группа: ${chatId}`,
    ].join('\n');
    await tgReply(notifyId, leadText);
  }
}

async function getGroupOperatorId(groupId: number): Promise<number | null> {
  try {
    const { rows } = await pool.query<{ telegram_id: string }>(
      `SELECT u.telegram_id FROM tg_operator_groups g
       JOIN users u ON u.id = g.operator_id
       WHERE g.group_id = $1 LIMIT 1`,
      [groupId],
    );
    if (rows[0]?.telegram_id) return parseInt(rows[0].telegram_id, 10);
  } catch { /* таблица может ещё не существовать */ }
  return null;
}

async function registerGroup(groupId: number, groupTitle: string | null, chatId: number): Promise<void> {
  // Находим оператора по его Telegram ID
  try {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE telegram_id = $1 LIMIT 1`,
      [String(chatId)],
    );
    const operatorId = rows[0]?.id;
    if (!operatorId) {
      await tgReply(chatId, 'Не найден аккаунт оператора. Убедитесь что ваш Telegram привязан в профиле tourhab.ru');
      return;
    }
    await pool.query(
      `INSERT INTO tg_operator_groups (group_id, operator_id, group_title)
       VALUES ($1, $2, $3)
       ON CONFLICT (group_id) DO UPDATE SET operator_id = $2, group_title = $3`,
      [groupId, operatorId, groupTitle],
    );
    await tgReply(chatId, `Группа зарегистрирована. Кузьмич будет мониторить туристические запросы и присылать лиды вам.`);
  } catch (err) {
    await tgReply(chatId, `Ошибка регистрации: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── Типы Telegram Update ──────────────────────────────────────────────────────

interface TgPhotoSize  { file_id: string; width: number; height: number }
interface TgVoice      { file_id: string; duration: number; mime_type?: string }
interface TgVideoNote  { file_id: string; duration: number }

interface TgUpdate {
  message?: {
    chat:    { id: number; type: 'private' | 'group' | 'supergroup' | 'channel'; title?: string };
    from?:   { id: number; first_name?: string; last_name?: string };
    text?:   string;
    caption?: string;
    photo?:  TgPhotoSize[];
    voice?:  TgVoice;
    video_note?: TgVideoNote;
  };
  channel_post?: {
    chat:    { id: number; type: string; title?: string };
    text?:   string;
    caption?: string;
  };
  callback_query?: {
    id:   string;
    from: { id: number };
    data: string;
    message?: { chat: { id: number } };
  };
}

// ── POST: Webhook ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update = await request.json() as TgUpdate;

    // ── callback_query: рейтинги ─────────────────────────────────────
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat.id ?? cq.from.id;

      if (cq.data === 'rate_good') {
        await saveRating(chatId, 'tourist', 5);
        await tgAnswerCallback(cq.id, 'Спасибо!');
        await tgReply(chatId, 'Рад помочь! Если понадоблюсь — пиши.');
      } else if (cq.data === 'rate_bad') {
        await saveRating(chatId, 'tourist', 1);
        await tgAnswerCallback(cq.id, 'Принято, буду лучше');
        await tgReply(chatId, 'Жаль. Расскажи что не так — постараюсь исправить.');
      } else if (cq.data === 'book_now') {
        await tgAnswerCallback(cq.id);
        await processMessage({
          chatId, text: 'Хочу забронировать тур',
          userName: null, userId: cq.from.id,
          mode: 'tourist', createdVia: 'telegram_inline',
          pending, reply: tgReply, platform: 'tg',
        });
      } else {
        await tgAnswerCallback(cq.id);
      }
      return NextResponse.json({ ok: true });
    }

    // ── channel_post: мониторинг каналов ──────────────────────────────
    if (update.channel_post) {
      const cp = update.channel_post;
      const text = cp.text ?? cp.caption ?? '';
      if (text && text.length >= 10) {
        groupMonitor.processMessage(
          String(cp.chat.id),
          cp.chat.title ?? 'Канал',
          'channel',
          text,
        );
      }
      return NextResponse.json({ ok: true });
    }

    const msg = update.message;
    if (!msg) return NextResponse.json({ ok: true });

    const chatId    = msg.chat.id;
    const fromId    = msg.from?.id ?? 0;
    const fromName  = msg.from?.first_name ?? null;
    const chatType  = msg.chat.type;
    const ownerId   = parseInt(process.env.TELEGRAM_OWNER_ID ?? '0', 10);
    const isPrivate = chatType === 'private';
    const isGroup   = chatType === 'group' || chatType === 'supergroup';

    // ── Владелец в личке → admin pipeline ─────────────────────────────────
    if (isPrivate && fromId === ownerId && msg.text) {
      const text = msg.text.trim();
      const cmd  = text.split(' ')[0]?.toLowerCase() ?? '';
      if (cmd.startsWith('/approve_') || cmd.startsWith('/reject_')) {
        await handleApproval(cmd, chatId);
      } else {
        await handleOwnerCommand(cmd, text, chatId);
      }
      return NextResponse.json({ ok: true });
    }

    // ── ГРУППА: /register_group или парсер лидов + разведка ─────────
    if (isGroup) {
      const text = msg.text ?? msg.caption ?? '';
      if (text.toLowerCase().startsWith('/register_group')) {
        await registerGroup(chatId, msg.chat.title ?? null, fromId);
        return NextResponse.json({ ok: true });
      }
      // Intelligence: тихий мониторинг в фоне
      if (text && text.length >= 10) {
        groupMonitor.processMessage(String(chatId), msg.chat.title ?? 'Группа', fromName ?? 'Участник', text);
      }
      // Lead detection: отвечаем только при явном туристическом интересе
      if (text) await processGroupMessage({ chatId, fromId, fromName, text });
      return NextResponse.json({ ok: true });
    }

    // ── ЛИЧКА: /partner EMAIL — регистрация оператора ────────────────────
    if (isPrivate && msg.text?.trim().toLowerCase().startsWith('/partner ')) {
      const email = msg.text.trim().slice('/partner '.length).trim();
      if (email.includes('@')) {
        const name = await registerOperatorChatId(chatId, email);
        if (name) {
          await tgReply(chatId, `Привет, ${name}! Ты подключён как оператор.\n\nТеперь я знаю кто ты — могу отвечать на вопросы о твоих бронированиях, турах и статистике. Пиши.`);
        } else {
          await tgReply(chatId, 'Email не найден в системе. Проверь адрес или напиши на tourhab.ru.');
        }
      } else {
        await tgReply(chatId, 'Формат: /partner email@example.com');
      }
      return NextResponse.json({ ok: true });
    }

    // ── ЛИЧКА: оператор? ─────────────────────────────────────────────────
    // Проверяем до туристского flow: если chatId есть в partners.telegram_chat_id
    const operator = isPrivate ? await findOperatorByChatId(chatId) : null;
    if (operator && msg.text) {
      const text = msg.text.trim();
      if (text === '/start') {
        await tgReply(chatId, `Привет, ${operator.partnerName}! Я твой AI-помощник.\n\nМогу ответить на вопросы о бронированиях, турах, статистике — или помочь составить ответ туристу. Пиши.`);
      } else {
        await processOperatorMessage({ chatId, text, fromName, operator, reply: tgReply });
      }
      return NextResponse.json({ ok: true });
    }

    // ── ЛИЧКА: турист ─────────────────────────────────────────────────────

    // /start — отправляем приветствие с клавиатурой быстрых тем (без processMessage)
    if (msg.text?.trim() === '/start') {
      await sendStartMessage(chatId, fromName);
      return NextResponse.json({ ok: true });
    }

    // Определяем рейтинг из текстовых эмодзи
    if (msg.text) {
      const t = msg.text.trim();
      if (t === '👍' || t.toLowerCase() === 'круто' || t.toLowerCase() === 'спасибо') {
        await saveRating(chatId, 'tourist', 5);
        await tgReply(chatId, 'Отлично! Пиши если что.');
        return NextResponse.json({ ok: true });
      }
      if (t === '👎') {
        await saveRating(chatId, 'tourist', 1);
        await tgReply(chatId, 'Жаль. Что можно улучшить?');
        return NextResponse.json({ ok: true });
      }
    }

    // Голосовое сообщение → транскрипция → processMessage
    if (msg.voice || msg.video_note) {
      const fileId = msg.voice?.file_id ?? msg.video_note?.file_id ?? '';
      await tgReply(chatId, 'Слушаю...');

      let transcription: string | undefined;
      try {
        const fileData = await downloadTgFile(fileId);
        if (fileData) {
          const { callGeminiTranscribe } = await import('@/lib/ai/providers');
          transcription = await callGeminiTranscribe(fileData.base64, fileData.mimeType) ?? undefined;
        }
      } catch { /* не критично */ }

      if (!transcription) {
        await tgReply(chatId, 'Не разобрал голосовое. Напишите текстом?');
        return NextResponse.json({ ok: true });
      }

      await tgReply(chatId, `<i>Вы сказали: ${transcription}</i>`);
      await processMessage({
        chatId, text: transcription, userName: fromName,
        userId: fromId, mode: 'tourist', createdVia: 'telegram_voice',
        pending, reply: tgReply,
        platform: 'tg', afterReply: afterAiReply,
      });
      return NextResponse.json({ ok: true });
    }

    // Фото → Gemini Vision → processMessage
    if (msg.photo?.length) {
      const bestPhoto = msg.photo[msg.photo.length - 1];
      await tgReply(chatId, 'Смотрю на фото...');

      let visionDescription: string | undefined;
      try {
        const photoData = await downloadTgFile(bestPhoto.file_id);
        if (photoData) {
          const { callGeminiVision } = await import('@/lib/ai/providers');
          visionDescription = await callGeminiVision(
            photoData.base64, photoData.mimeType,
            'Опиши что на фото: место, природа, деятельность. Если это Камчатка — укажи конкретно что это. Кратко, 2-3 предложения.',
          ) ?? undefined;
        }
      } catch { /* не критично */ }

      await processMessage({
        chatId, text: msg.caption?.trim() ?? 'Что это за место?',
        userName: fromName, userId: fromId, mode: 'tourist',
        createdVia: 'telegram', pending, reply: tgReply, visionDescription,
        platform: 'tg', afterReply: afterAiReply,
      });
      return NextResponse.json({ ok: true });
    }

    // Текст
    if (msg.text) {
      await processMessage({
        chatId, text: msg.text.trim(), userName: fromName,
        userId: fromId, mode: 'tourist', createdVia: 'telegram',
        pending, reply: tgReply,
        platform: 'tg', afterReply: afterAiReply,
      });
    }

  } catch { /* Telegram требует 200 OK всегда */ }

  return NextResponse.json({ ok: true });
}
