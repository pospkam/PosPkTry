/**
 * lib/scraping/brightdata.ts
 *
 * Bright Data Web Unlocker — обходит антибот-защиту и возвращает HTML.
 * Используется для скрейпинга страниц, которые блокируют обычные запросы.
 *
 * Требует переменную BRIGHTDATA_API_TOKEN в окружении.
 * Если токен не задан — возвращает null (graceful fallback).
 */

const BRIGHTDATA_API = 'https://api.brightdata.com/request';

export interface BrightDataOptions {
  zone?: string;
  country?: string;
  timeoutMs?: number;
}

/**
 * Скачивает страницу через Bright Data Web Unlocker.
 * Возвращает HTML-строку или null если токен не задан / ошибка.
 */
export async function fetchViaBrightData(
  url: string,
  options: BrightDataOptions = {},
): Promise<string | null> {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  if (!token) return null;

  const {
    zone = 'web_unlocker1',
    country = 'ru',
    timeoutMs = 30_000,
  } = options;

  try {
    const res = await fetch(BRIGHTDATA_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zone, url, country, format: 'raw' }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
