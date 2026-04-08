/**
 * HMAC-токен для защиты PDF endpoints от перебора booking ID.
 * Токен генерируется на сервере и встраивается в ссылку на скачивание.
 * Клиент без токена получает 403.
 */
import { createHmac, timingSafeEqual } from 'crypto';

export function makePdfToken(bookingId: number): string {
  const secret = process.env.JWT_SECRET ?? 'no-secret';
  return createHmac('sha256', secret)
    .update(`pdf:${bookingId}`)
    .digest('hex')
    .slice(0, 32); // 128 бит — достаточно для защиты от перебора
}

export function verifyPdfToken(bookingId: number, token: string): boolean {
  if (!token || token.length !== 32) return false;
  const expected = makePdfToken(bookingId);
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
