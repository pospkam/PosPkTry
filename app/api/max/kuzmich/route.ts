/**
 * POST /api/max/kuzmich
 * Бот Кузьмич для MAX мессенджера (VK).
 *
 * Два режима:
 *   POST — обработка webhook-апдейтов от MAX
 *   GET  — long-polling: забирает апдейты и обрабатывает (для cron / dev)
 *
 * Env vars: MAX_BOT_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { Bot, type Api } from '@maxhub/max-bot-api';
import { type PendingBooking, cleanupPending, processMessage } from '@/lib/kuzmich/core';
import { registerOperatorChatId } from '@/lib/kuzmich/operator-chat';

type ButtonIntent = 'default' | 'positive' | 'negative';
type MaxButton =
  | { type: 'callback'; text: string; payload: string; intent?: ButtonIntent }
  | { type: 'link'; text: string; url: string }
  | { type: 'request_contact'; text: string };

export const dynamic = 'force-dynamic';

// ── In-memory state ───────────────────────────────────────────────────────────

const pending = new Map<number, PendingBooking>();
setInterval(() => cleanupPending(pending), 5 * 60 * 1000);

let pollingMarker: number | null = null;

// ── MAX API client (lazy init via Bot — we don't start polling) ──────────────

let _api: Api | null = null;
function getApi(): Api | null {
  const token = process.env.MAX_BOT_TOKEN;
  if (!token) return null;
  if (!_api) {
    const bot = new Bot(token);
    _api = bot.api;
  }
  return _api;
}

// ── Reply via MAX API ─────────────────────────────────────────────────────────

async function maxReply(chatId: number, text: string): Promise<void> {
  const api = getApi();
  if (!api) return;
  try {
    await api.sendMessageToChat(chatId, text, { format: 'html' });
  } catch { /* не блокируем */ }
}

async function maxReplyWithButtons(chatId: number, text: string, buttons: MaxButton[][]): Promise<void> {
  const api = getApi();
  if (!api) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (api.sendMessageToChat as any)(chatId, text, {
      format: 'html',
      attachments: [{ type: 'inline_keyboard', payload: { buttons } }],
    });
  } catch { /* не блокируем */ }
}

// ── Стартовое меню ────────────────────────────────────────────────────────────

const START_MENU: MaxButton[][] = [
  [
    { type: 'callback', text: 'Рыбалка', payload: 'topic_fishing' },
    { type: 'callback', text: 'Вулканы', payload: 'topic_volcanoes' },
  ],
  [
    { type: 'callback', text: 'Медведи', payload: 'topic_bears' },
    { type: 'callback', text: 'Источники', payload: 'topic_springs' },
  ],
  [
    { type: 'callback', text: 'Подобрать тур', payload: 'topic_tour', intent: 'positive' },
    { type: 'callback', text: 'Цены', payload: 'topic_prices' },
  ],
];

const TOPIC_TEXTS: Record<string, string> = {
  topic_fishing: 'Рыбалка на Камчатке',
  topic_volcanoes: 'Вулканы Камчатки',
  topic_bears: 'Медведи Камчатки',
  topic_springs: 'Термальные источники',
  topic_tour: 'Подобрать тур на Камчатку',
  topic_prices: 'Цены на туры на Камчатку',
};

// Обнаружение рекомендации тура в ответе бота
function hasTourRecommendation(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('тур') || lower.includes('маршрут') || lower.includes('программа') || lower.includes('экскурс');
}

const BOOKING_BUTTONS: MaxButton[][] = [
  [
    { type: 'callback', text: 'Оформить заявку', payload: 'book_now', intent: 'positive' },
    { type: 'callback', text: 'Другой вариант', payload: 'other_tour' },
  ],
  [
    { type: 'link', text: 'Все туры на сайте', url: 'https://tourhab.ru/routes' },
  ],
];

// ── Скачивание медиа по URL → base64 ─────────────────────────────────────────

async function downloadMedia(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? 'application/octet-stream';
    const buf = await res.arrayBuffer();
    return { base64: Buffer.from(buf).toString('base64'), mimeType: ct.split(';')[0].trim() };
  } catch { return null; }
}

// ── Типы апдейтов MAX ────────────────────────────────────────────────────────

interface MaxAttachment {
  type: string;
  payload?: { url?: string; token?: string; photo_id?: number };
  filename?: string;
}

interface MaxUpdate {
  update_type: string;
  timestamp: number;
  // message_created
  message?: {
    sender?: { user_id: number; name: string; username?: string | null } | null;
    recipient: { chat_id: number | null; chat_type: string };
    body: { mid: string; seq: number; text: string | null; attachments?: MaxAttachment[] | null };
  };
  // bot_started
  chat_id?: number;
  user?: { user_id: number; name: string; username?: string | null };
  payload?: string | null;
  // message_callback
  callback?: {
    timestamp: number;
    callback_id: string;
    payload?: string;
    user: { user_id: number; name: string };
  };
  // сообщение с кнопками (приходит в message_callback)
  // message уже есть выше для message_created, переиспользуем структуру
}

// ── Обработка одного апдейта ──────────────────────────────────────────────────

async function handleUpdate(update: MaxUpdate): Promise<void> {
  // bot_started → /start
  if (update.update_type === 'bot_started' && update.chat_id) {
    let capturedStart = '';
    const capturingStart = async (id: number, text: string) => {
      capturedStart = text;
      await maxReply(id, text);
    };
    await processMessage({
      chatId: update.chat_id,
      text: '/start',
      userName: update.user?.name ?? null,
      userId: update.user?.user_id ?? null,
      mode: 'max',
      createdVia: 'max',
      pending,
      reply: capturingStart,
      platform: 'max',
    });
    if (capturedStart) {
      await maxReplyWithButtons(update.chat_id, 'Выберите тему или задайте вопрос:', START_MENU);
    }
    return;
  }

  // message_created → текст / фото / голос
  if (update.update_type === 'message_created' && update.message) {
    const msg = update.message;
    const chatId = msg.recipient.chat_id;
    if (!chatId) return;

    const text = msg.body.text?.trim() ?? '';
    const attachments = msg.body.attachments ?? [];
    const userName = msg.sender?.name ?? null;
    const userId = msg.sender?.user_id ?? null;

    // Фото → Gemini Vision
    const photoAtt = attachments.find(a => a.type === 'image');
    if (photoAtt?.payload?.url) {
      await maxReply(chatId, 'Смотрю на фото...');
      let visionDescription: string | undefined;
      try {
        const mediaData = await downloadMedia(photoAtt.payload.url);
        if (mediaData) {
          const { callGeminiVision } = await import('@/lib/ai/providers');
          visionDescription = await callGeminiVision(
            mediaData.base64, mediaData.mimeType,
            'Опиши что на фото: место, природа, деятельность. Если это Камчатка — укажи конкретно что это. Кратко, 2-3 предложения.',
          ) ?? undefined;
        }
      } catch { /* не критично */ }

      await processMessage({
        chatId, text: text || 'Что это за место?',
        userName, userId, mode: 'max',
        createdVia: 'max', pending, reply: maxReply, visionDescription,
        platform: 'max',
      });
      return;
    }

    // Голос / аудио → Gemini Transcribe
    const audioAtt = attachments.find(a => a.type === 'audio');
    if (audioAtt?.payload?.url) {
      await maxReply(chatId, 'Слушаю...');
      let transcription: string | undefined;
      try {
        const mediaData = await downloadMedia(audioAtt.payload.url);
        if (mediaData) {
          const { callGeminiTranscribe } = await import('@/lib/ai/providers');
          transcription = await callGeminiTranscribe(mediaData.base64, mediaData.mimeType) ?? undefined;
        }
      } catch { /* не критично */ }

      if (!transcription) {
        await maxReply(chatId, 'Не разобрал голосовое. Напишите текстом?');
        return;
      }

      await maxReply(chatId, `<i>Вы сказали: ${transcription}</i>`);
      await processMessage({
        chatId, text: transcription, userName, userId,
        mode: 'max', createdVia: 'max_voice', pending, reply: maxReply,
        platform: 'max',
      });
      return;
    }

    // Видео → описание через Vision
    const videoAtt = attachments.find(a => a.type === 'video');
    if (videoAtt?.payload?.url) {
      await maxReply(chatId, 'Видео пока не умею анализировать. Опишите словами или пришлите фото.');
      return;
    }

    // Регистрация оператора: /partner EMAIL или партнер EMAIL
    const lc = text.toLowerCase();
    const partnerPrefix = lc.startsWith('/partner ') ? '/partner '
      : lc.startsWith('партнер ') ? 'партнер '
      : lc.startsWith('партнёр ') ? 'партнёр '
      : lc.startsWith('оператор ') ? 'оператор '
      : null;
    if (partnerPrefix) {
      const email = text.slice(partnerPrefix.length).trim();
      if (email.includes('@')) {
        const name = await registerOperatorChatId(chatId, email);
        if (name) {
          await maxReply(chatId, `Привет, ${name}! Ты подключён как оператор.\n\nТеперь могу отвечать на вопросы о бронированиях, турах и статистике. Пиши.`);
        } else {
          await maxReply(chatId, 'Email не найден в системе. Проверь адрес или напиши на tourhab.ru.');
        }
      } else {
        await maxReply(chatId, 'Напиши: партнер email@example.com');
      }
      return;
    }

    // Текст
    if (text) {
      let capturedReply = '';
      const capturingReply = async (id: number, msg: string) => {
        capturedReply = msg;
        await maxReply(id, msg);
      };
      await processMessage({
        chatId, text, userName, userId,
        mode: 'max', createdVia: 'max', pending, reply: capturingReply,
        platform: 'max',
      });
      if (capturedReply && hasTourRecommendation(capturedReply)) {
        await maxReplyWithButtons(chatId, 'Хотите оформить заявку?', BOOKING_BUTTONS);
      }
    }
    return;
  }

  // message_callback → нажатие inline-кнопки
  if (update.update_type === 'message_callback' && update.callback) {
    const api = getApi();
    if (!api) return;

    const payload = update.callback.payload ?? '';
    // В callback-апдейте chat_id берётся из message.recipient.chat_id
    const callbackChatId: number | null | undefined = update.message?.recipient.chat_id;

    // Подтверждаем получение
    await api.answerOnCallback(update.callback.callback_id, {
      notification: '',
    }).catch(() => {});

    if (!callbackChatId) return;

    const userName = update.callback.user.name;
    const userId = update.callback.user.user_id;

    // Топик-кнопки → шлём как обычный запрос
    if (payload in TOPIC_TEXTS) {
      const topicText = TOPIC_TEXTS[payload];
      let capturedReply = '';
      const capturingReply = async (id: number, msg: string) => {
        capturedReply = msg;
        await maxReply(id, msg);
      };
      await processMessage({
        chatId: callbackChatId, text: topicText, userName, userId,
        mode: 'max', createdVia: 'max', pending, reply: capturingReply,
        platform: 'max',
      });
      if (capturedReply && hasTourRecommendation(capturedReply)) {
        await maxReplyWithButtons(callbackChatId, 'Хотите оформить заявку?', BOOKING_BUTTONS);
      }
      return;
    }

    // Кнопка "Оформить заявку"
    if (payload === 'book_now') {
      await processMessage({
        chatId: callbackChatId,
        text: 'Хочу оформить заявку на тур',
        userName, userId,
        mode: 'max', createdVia: 'max', pending, reply: maxReply,
        platform: 'max',
      });
      return;
    }

    // Кнопка "Другой вариант"
    if (payload === 'other_tour') {
      await maxReplyWithButtons(callbackChatId, 'Хорошо! Выберите тему, и я подберу что-то ещё:', START_MENU);
      return;
    }
  }
}

// ── POST: Webhook endpoint ────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // MAX может отправить один апдейт или массив
    const updates: MaxUpdate[] = Array.isArray(body) ? body : [body];

    for (const update of updates) {
      await handleUpdate(update);
    }
  } catch { /* всегда 200 OK */ }

  return NextResponse.json({ ok: true });
}

// ── GET: Long-polling endpoint (для cron или dev) ─────────────────────────────

export async function GET(): Promise<NextResponse> {
  const api = getApi();
  if (!api) {
    return NextResponse.json({ error: 'MAX_BOT_TOKEN not set' }, { status: 500 });
  }

  try {
    const extra: Record<string, unknown> = { limit: 50, timeout: 1 };
    if (pollingMarker) extra.marker = pollingMarker;

    const response = await api.getUpdates(
      ['message_created', 'bot_started', 'message_callback'],
      extra as Parameters<typeof api.getUpdates>[1],
    );

    pollingMarker = response.marker;

    let processed = 0;
    for (const update of response.updates) {
      await handleUpdate(update as unknown as MaxUpdate);
      processed++;
    }

    return NextResponse.json({
      ok: true,
      processed,
      marker: pollingMarker,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
