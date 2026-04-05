/**
 * ExternalResearcher — разведка внешнего мира для агентов.
 *
 * Уровни (в порядке приоритета):
 *   1. Firecrawl API  — если FIRECRAWL_API_KEY задан (скрапинг конкурентов)
 *   2. Tavily API     — если TAVILY_API_KEY задан
 *   3. Brave Search   — если BRAVE_SEARCH_API_KEY задан
 *   4. RSS + wttr.in  — БЕСПЛАТНО, без ключей (дефолт)
 *
 * RSS-источники подобраны под туристическую платформу Камчатки.
 * wttr.in — бесплатная погода для агента Спасатель.
 */

import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ChatMessage } from '@/lib/ai/prompts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawResult {
  title:   string;
  url:     string;
  snippet: string;
}

interface DomainConfig {
  query:   string;
  filter:  string;
  rss:     string[];
  /** URLs конкурентов/источников для Firecrawl scraping */
  scrapeTargets?: string[];
}

// ── Firecrawl scraper (приоритет 1) ───────────────────────────────────────────

const SCRAPE_TARGETS: Record<string, string[]> = {
  hacker: [
    'https://kamchatkaland.ru/tours',
    'https://vulcanarium.com/tours',
    'https://kamchatka-travel.com/tours',
  ],
  quality: [
    'https://www.tripadvisor.ru/Attractions-g298488-Activities-Petropavlovsk_Kamchatsky_Kamchatka_Krai_Far_Eastern_District.html',
  ],
  content: [
    'https://kamchatkaland.ru/',
    'https://visitkamchatka.ru/',
  ],
  admin: [
    'https://www.tourprom.ru/',
  ],
};

async function scrapeFirecrawl(url: string): Promise<RawResult[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  const baseUrl = process.env.FIRECRAWL_BASE_URL || 'https://api.firecrawl.dev';
  if (!key) return [];

  try {
    const res = await fetch(`${baseUrl}/v1/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 15000,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return [];

    const data = await res.json() as {
      success?: boolean;
      data?: {
        markdown?: string;
        metadata?: { title?: string; sourceURL?: string };
      };
    };

    if (!data.success || !data.data?.markdown) return [];

    const md = data.data.markdown;
    const title = data.data.metadata?.title || url;
    const sourceUrl = data.data.metadata?.sourceURL || url;

    // Разбиваем markdown на смысловые блоки (по заголовкам или абзацам)
    const blocks = md.split(/\n#{1,3}\s+/).filter(b => b.trim().length > 50);
    return blocks.slice(0, 5).map(block => ({
      title,
      url: sourceUrl,
      snippet: block.replace(/\n+/g, ' ').trim().substring(0, 500),
    }));
  } catch {
    return [];
  }
}

async function fetchFirecrawlForAgent(agentId: string): Promise<RawResult[]> {
  const targets = SCRAPE_TARGETS[agentId];
  if (!targets || !process.env.FIRECRAWL_API_KEY) return [];

  const results: RawResult[] = [];
  for (const url of targets) {
    const items = await scrapeFirecrawl(url).catch(() => []);
    results.push(...items);
    if (results.length >= 8) break;
  }
  return results;
}

// ── RSS-источники и поисковые темы по агентам ─────────────────────────────────

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  admin: {
    query:  'туристическая платформа онлайн бронирование Россия тренды 2026',
    filter: 'Изменения в онлайн-бронировании туров, новые платформы-конкуренты, изменения в работе туристических агрегаторов России.',
    rss:    [
      'https://rata-news.ru/feed/',
      'https://www.tourprom.ru/news/rss/',
    ],
  },
  legal: {
    query:  'изменения законодательство туризм Россия 2026 операторы',
    filter: 'Новые законы и поправки для туристических операторов и агрегаторов в России. Лицензирование, страхование, ответственность.',
    rss:    [
      'https://rata-news.ru/feed/',
      'https://ator.ru/rss.xml',
    ],
  },
  hacker: {
    query:  'туризм конверсия UX маркетинг онлайн путешествия тренды 2026',
    filter: 'Новые стратегии роста для туристических платформ: конверсия, удержание, маркетинг. Что работает у конкурентов.',
    rss:    [
      'https://www.tourprom.ru/news/rss/',
      'https://rata-news.ru/feed/',
    ],
  },
  rescue: {
    query:  'Камчатка туристы безопасность ЧС погода вулкан 2026',
    filter: 'Инциденты с туристами на Камчатке, изменения в требованиях безопасности, новые протоколы МЧС для туристических маршрутов.',
    rss:    [
      'https://www.kamgov.ru/news/rss',
    ],
  },
  eco: {
    query:  'Камчатка экология туризм нагрузка охраняемые зоны 2026',
    filter: 'Изменения в правилах посещения природных зон Камчатки, новые ограничения, экологические инциденты связанные с туризмом.',
    rss:    [
      'https://www.kamgov.ru/news/rss',
      'https://rata-news.ru/feed/',
    ],
  },
  content: {
    query:  'Камчатка туризм тренды отзывы соцсети маркетинг 2026',
    filter: 'Что туристы говорят о Камчатке, топ запросов, вирусный контент про Камчатку, что ищут путешественники.',
    rss:    [
      'https://www.tourprom.ru/news/rss/',
      'https://rata-news.ru/feed/',
    ],
  },
  quality: {
    query:  'туристические операторы рейтинги жалобы качество Россия 2026',
    filter: 'Жалобы на туристических операторов, изменения стандартов качества, новые требования к туроператорам в России.',
    rss:    [
      'https://ator.ru/rss.xml',
      'https://rata-news.ru/feed/',
    ],
  },
  evo: {
    query:  'new AI model release multimodal LLM 2026 Qwen Gemini Claude GPT DeepSeek',
    filter: 'Новые AI-модели и инструменты: релизы LLM (Qwen, Gemini, GPT, Claude, DeepSeek), мультимодальность, AI-агенты, автоматизация. Что можно применить в туристической платформе: дешевле/быстрее/умнее.',
    rss:    [
      'https://habr.com/ru/rss/hub/artificial_intelligence/all/?fl=ru',
      'https://huggingface.co/blog/feed.xml',
      'https://openai.com/blog/rss/',
      'https://www.anthropic.com/rss.xml',
    ],
  },
  security: {
    query:  'онлайн платежи мошенничество туризм фишинг безопасность 2026',
    filter: 'Новые схемы мошенничества в онлайн-туризме, инциденты с утечками данных в туристических платформах.',
    rss:    [
      'https://rata-news.ru/feed/',
    ],
  },
  intelligence: {
    query:  'туризм Камчатка конкуренты агрегаторы новые туры тренды рынок 2026',
    filter: 'Новые предложения туристических платформ России и Камчатки: фичи, форматы туров, ценовые стратегии, технологические инновации.',
    rss:    [
      'https://www.tourprom.ru/news/rss/',
      'https://rata-news.ru/feed/',
      'https://ator.ru/rss.xml',
    ],
  },
};

// ── RSS parser (без npm-зависимостей) ─────────────────────────────────────────

function parseRssItems(xml: string, limit = 6): RawResult[] {
  const items: RawResult[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;

  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];

    const title   = (/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i.exec(block) ?? [])[1]?.trim() ?? '';
    const link    = (/<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i.exec(block) ?? [])[1]?.trim() ?? '';
    const descRaw = (/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(block) ?? [])[1]?.trim() ?? '';

    // Снимаем HTML-теги из описания
    const snippet = descRaw
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 350);

    if (title && link) {
      items.push({ title, url: link, snippet });
    }
  }
  return items;
}

async function fetchRss(url: string): Promise<RawResult[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TourHab-Bot/1.0' },
    signal:  AbortSignal.timeout(7000),
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRssItems(xml);
}

// ── Погода Камчатки (wttr.in — бесплатно) для агента rescue ──────────────────

async function fetchKamchatkaWeather(): Promise<string | null> {
  try {
    const res = await fetch(
      'https://wttr.in/Petropavlovsk-Kamchatsky?format=j1',
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;

    const data = await res.json() as {
      current_condition?: Array<{
        temp_C?: string;
        weatherDesc?: Array<{ value?: string }>;
        windspeedKmph?: string;
        visibility?: string;
      }>;
      weather?: Array<{
        date?: string;
        hourly?: Array<{ tempC?: string; weatherDesc?: Array<{ value?: string }> }>;
      }>;
    };

    const cur         = data.current_condition?.[0];
    const desc        = cur?.weatherDesc?.[0]?.value ?? '';
    const tempC       = cur?.temp_C ?? '?';
    const windKmph    = cur?.windspeedKmph ?? '?';
    const tomorrow    = data.weather?.[1];
    const tomorrowMax = tomorrow?.hourly?.reduce((mx, h) =>
      Math.max(mx, parseInt(h.tempC ?? '0', 10)), -99) ?? '?';

    return [
      `Петропавловск-Камчатский сейчас: ${tempC}°C, ${desc}, ветер ${windKmph} км/ч.`,
      `Завтра: до ${tomorrowMax}°C.`,
    ].join(' ');
  } catch {
    return null;
  }
}

// ── Search backends (Tavily / Brave — опционально) ────────────────────────────

async function searchTavily(query: string): Promise<RawResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const res = await fetch('https://api.tavily.com/search', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ api_key: key, query, search_depth: 'basic', max_results: 5 }),
    signal:  AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json() as { results?: Array<{ title: string; url: string; content: string }> };
  return (data.results ?? []).map(r => ({ title: r.title, url: r.url, snippet: r.content.substring(0, 400) }));
}

async function searchBrave(query: string): Promise<RawResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&country=ru`;
  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': key },
    signal:  AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
  return (data.web?.results ?? []).map(r => ({ title: r.title, url: r.url, snippet: r.description ?? '' }));
}

// ── Получить результаты для домена ───────────────────────────────────────────

async function fetchForDomain(agentId: string, cfg: DomainConfig): Promise<RawResult[]> {
  // Firecrawl: скрапинг реальных данных конкурентов (приоритет 1)
  const scraped = await fetchFirecrawlForAgent(agentId).catch(() => []);
  if (scraped.length > 0) return scraped;

  // Поисковые API (если настроены)
  const premium = await searchTavily(cfg.query).catch(() => []);
  if (premium.length > 0) return premium;

  const brave = await searchBrave(cfg.query).catch(() => []);
  if (brave.length > 0) return brave;

  // Fallback: читаем RSS-ленты бесплатно
  const rssResults: RawResult[] = [];
  for (const rssUrl of cfg.rss) {
    const items = await fetchRss(rssUrl).catch(() => []);
    rssResults.push(...items);
    if (rssResults.length >= 6) break;
  }

  // Для агента-спасателя добавляем погоду Камчатки
  if (agentId === 'rescue') {
    const weather = await fetchKamchatkaWeather();
    if (weather) {
      rssResults.unshift({ title: 'Текущая погода Петропавловск-Камчатский', url: 'https://wttr.in', snippet: weather });
    }
  }

  return rssResults;
}

// ── AI-фильтр релевантности ───────────────────────────────────────────────────

async function filterRelevant(
  results:  RawResult[],
  filter:   string,
  agentId:  string,
): Promise<string | null> {
  if (results.length === 0) return null;

  const snippets = results
    .slice(0, 6)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
    .join('\n\n');

  const prompt = [
    `Ты аналитик туристической платформы Камчатки (онлайн-маркетплейс туров, 1 оператор, 1189 маршрутов).`,
    `Из результатов ниже выдели ТОЛЬКО то, что реально важно для платформы.`,
    `Критерий важности: ${filter}`,
    ``,
    `Материалы:`,
    snippets,
    ``,
    `Если ничего важного нет — ответь ровно: NULL`,
    `Если есть — дай сводку 2-3 пункта (маркированный список). Без воды. Агент "${agentId}" использует это в докладе.`,
  ].join('\n');

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const text = await callAIWithModelDirect(messages, getModelForAgent(agentId)).catch(() => null);
  if (!text || text.trim().toUpperCase() === 'NULL') return null;
  return text.trim();
}

// ── ExternalResearcher ────────────────────────────────────────────────────────

export class ExternalResearcher {
  /**
   * Запускает разведку для всех агентов параллельно.
   * Работает без API-ключей (RSS + wttr.in).
   * С TAVILY_API_KEY или BRAVE_SEARCH_API_KEY — даёт более свежие результаты.
   *
   * Никогда не бросает исключений — тихо возвращает {} при ошибках.
   */
  async fetchSignals(agentIds: string[]): Promise<Record<string, string>> {
    const tasks = agentIds
      .filter(id => !!DOMAIN_CONFIGS[id])
      .map(async (id): Promise<[string, string] | null> => {
        const cfg = DOMAIN_CONFIGS[id];
        try {
          const results  = await fetchForDomain(id, cfg);
          const filtered = await filterRelevant(results, cfg.filter, id);
          if (!filtered) return null;
          return [id, filtered];
        } catch {
          return null;
        }
      });

    const settled = await Promise.allSettled(tasks);
    const out: Record<string, string> = {};

    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) {
        const [id, text] = r.value;
        out[id] = text;
      }
    }

    return out;
  }
}

export const externalResearcher = new ExternalResearcher();
