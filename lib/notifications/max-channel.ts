/**
 * Постинг в MAX-канал через MAX Bot API.
 *
 * Бот должен быть админом канала с правами на публикацию.
 * Env: MAX_BOT_TOKEN, MAX_CHANNEL_ID (chat_id канала в MAX).
 *
 * Если MAX_CHANNEL_ID не задан — пропускаем постинг (не блокируем TG).
 */

import { Bot, type Api } from '@maxhub/max-bot-api';

// ── Lazy API init ─────────────────────────────────────────────────────────────

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

// ── HTML → MAX format conversion ──────────────────────────────────────────────

/**
 * MAX API поддерживает HTML-формат (format: 'html').
 * TG и MAX совместимы по базовым тегам: <b>, <i>, <a>, <code>.
 * Убираем только TG-специфичные теги если есть.
 */
function convertTgToMax(html: string): string {
  // MAX поддерживает <b>, <i>, <a>, <code>, <pre> — совпадает с TG
  return html;
}

// ── Posting ───────────────────────────────────────────────────────────────────

/**
 * Отправить текстовый пост в MAX-канал.
 * Если MAX не настроен — возвращает ok: false без ошибки (не блокирует).
 */
export async function maxPostToChannel(text: string): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const channelId = process.env.MAX_CHANNEL_ID;
  if (!channelId) return { ok: false, skipped: true, error: 'MAX_CHANNEL_ID not set' };

  const api = getApi();
  if (!api) return { ok: false, skipped: true, error: 'MAX_BOT_TOKEN not set' };

  const chatId = parseInt(channelId, 10);
  if (isNaN(chatId)) return { ok: false, error: 'MAX_CHANNEL_ID is not a valid number' };

  try {
    const maxText = convertTgToMax(text);
    await api.sendMessageToChat(chatId, maxText, { format: 'html' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'MAX API error' };
  }
}

/**
 * Отправить пост с фото (по URL) в MAX-канал.
 * photoUrl — прямая ссылка на изображение (в т.ч. Telegram file URL).
 * caption  — подпись под фото (может быть пустой).
 */
export async function maxPostPhotoToChannel(
  photoUrl: string,
  caption: string,
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const channelId = process.env.MAX_CHANNEL_ID;
  if (!channelId) return { ok: false, skipped: true, error: 'MAX_CHANNEL_ID not set' };

  const api = getApi();
  if (!api) return { ok: false, skipped: true, error: 'MAX_BOT_TOKEN not set' };

  const chatId = parseInt(channelId, 10);
  if (isNaN(chatId)) return { ok: false, error: 'MAX_CHANNEL_ID is not a valid number' };

  try {
    const attachment: import('@maxhub/max-bot-api').ImageAttachment =
      new (await import('@maxhub/max-bot-api')).ImageAttachment({ url: photoUrl });

    await api.sendMessageToChat(chatId, caption, {
      attachments: [attachment.toJson()],
      format: 'html',
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'MAX API error' };
  }
}

/**
 * Отправить личное сообщение пользователю MAX по chat_id.
 * Используется для уведомлений операторам.
 */
export async function maxSendDm(chatId: number | string, text: string): Promise<{ ok: boolean; error?: string }> {
  const api = getApi();
  if (!api) return { ok: false, error: 'MAX_BOT_TOKEN not set' };

  const id = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;
  if (isNaN(id)) return { ok: false, error: 'invalid chat_id' };

  try {
    await api.sendMessageToChat(id, text, { format: 'html' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'MAX API error' };
  }
}

/**
 * Утилита: найти все чаты бота (для определения channel_id).
 * Вызывать вручную из /api/max/setup для поиска канала.
 */
export async function maxListChats(): Promise<{ ok: boolean; chats?: unknown[]; error?: string }> {
  const api = getApi();
  if (!api) return { ok: false, error: 'MAX_BOT_TOKEN not set' };

  try {
    const res = await api.getAllChats();
    return { ok: true, chats: (res as unknown as { chats: unknown[] }).chats ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'MAX API error' };
  }
}
