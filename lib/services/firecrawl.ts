/**
 * lib/services/firecrawl.ts
 *
 * Thin wrapper around Firecrawl REST API v1.
 * Используется для:
 *   - visitkamchatka-importer (парсинг маршрутов)
 *   - intelligence-monitor (скрапинг конкурентов)
 *
 * Env: FIRECRAWL_API_KEY
 * Без ключа все методы тихо возвращают null / [].
 */

const BASE = 'https://api.firecrawl.dev/v1';
const TIMEOUT_MS = 30_000;

export interface FirecrawlPage {
  markdown: string;
  html: string | null;
  metadata: {
    title?: string;
    description?: string;
    url?: string;
    statusCode?: number;
  };
}

function key(): string | null {
  return process.env.FIRECRAWL_API_KEY ?? null;
}

// ── Scrape one URL → markdown ────────────────────────────────────────────────

export async function firecrawlScrape(url: string): Promise<FirecrawlPage | null> {
  const apiKey = key();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${BASE}/scrape`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 1000,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) return null;
    const json = await res.json() as { success?: boolean; data?: FirecrawlPage };
    if (!json.success || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

// ── Batch scrape (up to 10 URLs) ─────────────────────────────────────────────

export async function firecrawlBatch(urls: string[]): Promise<FirecrawlPage[]> {
  if (!key() || urls.length === 0) return [];

  const results = await Promise.allSettled(
    urls.slice(0, 10).map(u => firecrawlScrape(u)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<FirecrawlPage> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

// ── Check if Firecrawl is configured ─────────────────────────────────────────

export function firecrawlAvailable(): boolean {
  return Boolean(key());
}
