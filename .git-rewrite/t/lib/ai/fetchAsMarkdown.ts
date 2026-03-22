import { unstable_cache } from 'next/cache';

/**
 * Удаление HTML-тегов из строки.
 * Убирает script, style, и все остальные теги, оставляя текст.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Загружает URL и возвращает контент в формате markdown.
 *
 * Стратегия:
 * 1. Попытка через markdown.new (80% меньше токенов для AI)
 * 2. Fallback: прямой fetch + strip HTML тегов
 *
 * Результат кэшируется на 1 час через unstable_cache.
 */
export const fetchAsMarkdown = unstable_cache(
  async (url: string): Promise<string> => {
    // Попытка через markdown.new конвертер
    try {
      const markdownUrl = `https://markdown.new/${url}`;
      const res = await fetch(markdownUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // markdown.new недоступен -- пробуем fallback
    }

    // Fallback: прямой fetch + удаление HTML тегов
    try {
      const raw = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });
      const html = await raw.text();
      return stripHtml(html);
    } catch {
      return '';
    }
  },
  ['fetch-as-markdown'],
  { revalidate: 3600 }
);
