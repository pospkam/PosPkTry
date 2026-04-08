/**
 * lib/telegram/mtproto-client.ts
 *
 * Singleton TelegramClient (MTProto, gramjs).
 * Использует юзер-аккаунт для полного доступа к Telegram API.
 *
 * Переменные окружения (.env.local / Timeweb):
 *   TG_API_ID        — App api_id из https://my.telegram.org/apps
 *   TG_API_HASH      — App api_hash
 *   TG_USER_SESSION  — StringSession (получить через scripts/tg-auth.ts)
 *   TG_PHONE         — номер телефона (запасной, для re-auth)
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const API_ID      = parseInt(process.env.TG_API_ID      ?? '0', 10);
const API_HASH    = process.env.TG_API_HASH    ?? '';
const SESSION_STR = process.env.TG_USER_SESSION ?? '';

let _client: TelegramClient | null = null;
let _connecting = false;

/**
 * Возвращает подключённый TelegramClient.
 * При первом вызове создаёт и подключает; последующие вызовы возвращают кеш.
 */
export async function getMTProtoClient(): Promise<TelegramClient> {
  if (_client && _client.connected) return _client;

  if (!API_ID || !API_HASH) {
    throw new Error('TG_API_ID и TG_API_HASH не заданы — MTProto недоступен');
  }
  if (!SESSION_STR) {
    throw new Error('TG_USER_SESSION не задан — запустите scripts/tg-auth.ts');
  }

  // Ждём если уже идёт подключение (на случай параллельных вызовов)
  if (_connecting) {
    await new Promise<void>(res => {
      const poll = setInterval(() => {
        if (!_connecting) { clearInterval(poll); res(); }
      }, 200);
    });
    if (_client?.connected) return _client;
  }

  _connecting = true;
  try {
    const session = new StringSession(SESSION_STR);
    _client = new TelegramClient(session, API_ID, API_HASH, {
      connectionRetries: 3,
      retryDelay: 2000,
      autoReconnect: true,
      useWSS: false, // на сервере без браузерного WebSocket
    });
    await _client.connect();
    return _client;
  } finally {
    _connecting = false;
  }
}

/**
 * Проверяет, сконфигурирован ли MTProto (нужные env vars есть).
 */
export function isMTProtoConfigured(): boolean {
  return !!(API_ID && API_HASH && SESSION_STR);
}
