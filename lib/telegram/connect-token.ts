/**
 * Telegram Connect Token
 *
 * Позволяет email-пользователям привязать свой Telegram-аккаунт к платформе.
 * Генерирует подписанный HMAC-токен, используемый в deep link:
 *   https://t.me/KuzmichKam_bot?start=link_{token}
 *
 * После клика Telegram вызывает /start link_{token} в боте:
 *   - Проверяем подпись
 *   - Сохраняем telegram_id в users
 *   - Отправляем персональное приветствие
 *
 * Токен действителен 30 минут. Никакой DB не нужно.
 */

import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 минут

function getSecret(): string {
  return process.env.CONNECT_TOKEN_SECRET ?? process.env.JWT_SECRET ?? 'dev-connect-secret';
}

/**
 * Генерирует connect-токен для привязки Telegram.
 * Формат: base64url(userId:expiry).hmac
 */
export function generateConnectToken(userId: string): string {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}:${expiry}`;
  const encoded = Buffer.from(payload).toString('base64url');
  const hmac = createHmac('sha256', getSecret()).update(encoded).digest('hex').slice(0, 16);
  return `${encoded}.${hmac}`;
}

/**
 * Верифицирует токен. Возвращает userId или null если невалиден/истёк.
 */
export function verifyConnectToken(token: string): string | null {
  try {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return null;

    const encoded = token.slice(0, dot);
    const receivedHmac = token.slice(dot + 1);

    // Timing-safe compare
    const expectedHmac = createHmac('sha256', getSecret()).update(encoded).digest('hex').slice(0, 16);
    if (!timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) return null;

    const payload = Buffer.from(encoded, 'base64url').toString();
    const [userId, expiryStr] = payload.split(':');
    if (!userId || !expiryStr) return null;

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) return null;

    return userId;
  } catch {
    return null;
  }
}

/**
 * Генерирует полный deep link для привязки Telegram.
 */
export function buildConnectLink(userId: string): string {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'KuzmichKam_bot';
  const token = generateConnectToken(userId);
  return `https://t.me/${botUsername}?start=link_${token}`;
}
