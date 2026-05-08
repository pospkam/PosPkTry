/**
 * lib/services/intelligence-monitor.service.ts
 *
 * Automated intelligence monitoring — Вариант Б: идеи для фич.
 * Отслеживаем что делают лидеры travel-AI индустрии и какие паттерны
 * можно внедрить в TourHab.
 *
 * Мониторинг:
 *   1. Travel-AI продукты и фичи (PhocusWire, Skift, HN, PH)
 *   2. AI & Tech — новые модели/паттерны (OpenAI, Anthropic, a16z)
 *   3. Конкуренты — Камчатка, TravelPayouts (Kamgov, RATA, Tourdom)
 *
 * Runs via /api/cron/intelligence every 6 hours.
 * Stores findings in agent_memory (evo agent) and ai_actions_log.
 * Sends critical findings to Telegram immediately.
 *
 * Data sources (all RF-accessible):
 *   - RSS: habr.com, openai.com, huggingface.co, anthropic.com, rata-news.ru, tourprom.ru
 *   - Search: Tavily (if key set), Brave Search (if key set)
 *   - Fallback: RSS-only (zero-cost, zero-key)
 */

import { callAIWithModelDirect } from '@/lib/ai/providers';
import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { knowledgeBase } from '@/lib/agents/memory/agent-knowledge';
import { pool } from '@/lib/db-pool';
import { postAINewsToChannel, postTravelNewsToChannel } from '@/lib/notifications/telegram-channel';
import { firecrawlScrape, firecrawlAvailable } from '@/lib/services/firecrawl';
import type { ChatMessage } from '@/lib/ai/prompts';

// ── Types ────────────────────────────────────────────────────────────────────

interface RawSignal {
  title:   string;
  url:     string;
  snippet: string;
  source:  string;
}

/** Hacker News Algolia search result */
interface HNHit {
  objectID: string;
  title: string;
  url: string;
  points: number;
  num_comments: number;
  author: string;
  _highlightResult?: {
    story_text?: { value: string };
  };
}

/** HN Algolia API search response */
interface HNResponse {
  hits: HNHit[];
}

export interface IntelligenceFinding {
  domain:     'ai_tech' | 'travel_industry' | 'competitors' | 'travel_ai';
  summary:    string;
  signals:    RawSignal[];
  urgency:    'critical' | 'notable' | 'informational';
  action_items: string[];
}

export interface IntelligenceReport {
  timestamp:  string;
  domains:    IntelligenceFinding[];
  raw_count:  number;
  duration_ms: number;
}

// ── RSS Sources ──────────────────────────────────────────────────────────────

interface DomainSource {
  label:   string;
  rss:     string[];
  search_query: string;
  ai_filter: string;
}

// ── Hardcoded fallback (used when intelligence_sources table doesn't exist yet) ─

// ── Travel-AI specific RSS/search sources ────────────────────────────────────

/** Skift RSS feed (verified working) */
const SKIFT_RSS = 'https://skift.com/feed/';

/** Product Hunt main feed (Atom, verified working) */
const PRODUCTHUNT_FEED = 'https://www.producthunt.com/feed';

/** Mindtrip blog — blocked by Cloudflare, use Firecrawl */
const MINDTRIP_BLOG = 'https://mindtrip.ai/blog';

/** Amadeus blog — no RSS, use Firecrawl */
const AMADEUS_BLOG = 'https://amadeus.com/en/blog';

/** PhocusWire — blocked by Cloudflare, use Firecrawl */
const PHOCUSWIRE = 'https://www.phocuswire.com/Latest-News';

/** TAAFT newsletter — blocked by Cloudflare, use Firecrawl */
const TAAFT_NEWSLETTER = 'https://newsletter.taaft.com/';

/** HN Algolia API base */
const HN_ALGOLIA_API = 'https://hn.algolia.com/api/v1/search';

async function searchHackerNews(query: string): Promise<RawSignal[]> {
  try {
    const url = `${HN_ALGOLIA_API}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json() as HNResponse;
    return (data.hits ?? []).map((h) => ({
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      snippet: h._highlightResult?.story_text?.value
        ? h._highlightResult.story_text.value.replace(/<[^>]+>/g, ' ').substring(0, 400)
        : `${h.points} pts · ${h.num_comments} comments · by ${h.author}`,
      source: 'hackernews',
    }));
  } catch {
    return [];
  }
}

// ── Hardcoded fallback (used when intelligence_sources table doesn't exist yet) ─

const FALLBACK_DOMAINS: Record<string, DomainSource> = {
  ai_tech: {
    label: 'AI & Technology',
    rss: [
      'https://habr.com/ru/rss/hub/artificial_intelligence/all/?fl=ru',
      'https://habr.com/ru/rss/hub/machine_learning/all/?fl=ru',
      'https://blog.google/technology/ai/rss/',
      'https://huggingface.co/blog/feed.xml',
      'https://openai.com/blog/rss.xml',
      'https://www.anthropic.com/rss.xml',
    ],
    search_query: 'AI agents travel platform automation LLM 2026',
    ai_filter: `Релевантные для туристической AI-платформы: новые LLM модели (особенно дешёвые/быстрые),
AI-агенты для бизнеса, автоматизация клиентского сервиса, RAG/поиск, мультимодальность,
инструменты для стартапов (Claude, GPT, DeepSeek, Gemini, open-source).
Игнорируй: чисто академические статьи, computer vision без применения к travel, робототехнику.`,
  },
  travel_industry: {
    label: 'Travel Industry',
    rss: [
      'https://rata-news.ru/feed/',
      'https://www.tourprom.ru/news/rss/',
      'https://ator.ru/rss.xml',
      'https://www.atorus.ru/rss/news.xml',
    ],
    search_query: 'туризм Россия Камчатка тренды регулирование 2026 онлайн бронирование',
    ai_filter: `Важно для туристической платформы Камчатки:
- Изменения в законодательстве/лицензировании туроператоров РФ
- Новые тренды внутреннего туризма (Камчатка, Байкал, Алтай)
- Ценовые изменения на авиабилеты в регионы
- Санкционные изменения влияющие на travel-сервисы
- Новые платформы/агрегаторы на российском рынке
Игнорируй: выездной туризм, пляжный отдых Турция/Египет, круизы.`,
  },
  competitors: {
    label: 'Competitors & Market',
    rss: [
      'https://www.kamgov.ru/news/rss',
    ],
    search_query: 'Камчатка туры бронирование explore-kamchatka kam.tours kamchatkaland 2026',
    ai_filter: `Прямые конкуренты TourHab (Камчатка):
- explore-kamchatka.ru — что нового? цены? функции?
- kam.tours — акции, новые маршруты?
- kamchatkaland.ru, kamchatka.guide — изменения?
- Федеральные: Tripster/Sputnik8/Avito Travel — Камчатка раздел
Ищи: новые маршруты, ценовые изменения, технологические фичи, маркетинговые кампании.
Игнорируй: общие новости Камчатского края не связанные с туризмом.`,
  },
  travel_ai: {
    label: 'Travel-AI (Western sources)',
    rss: [
      SKIFT_RSS,      // ✅ verified
      PRODUCTHUNT_FEED, // ✅ verified (main feed, AI filter will pick travel)
    ],
    search_query: 'travel AI agent itinerary planning booking automation 2026',
    ai_filter: `Ты анализируешь travel-tech новости для владельца AI-travel платформы.
Задача: найти новые фичи/паттерны которые можно реализовать у себя.

Для каждой релевантной новости:
1. Что конкретно внедрили? (1-2 предложения)
2. Какую пользовательскую боль это решает?
3. Можно ли это реализовать в Next.js + Claude API + Postgres?
4. Приоритет для нас: высокий / средний / низкий
5. Ссылка на источник

Игнорируй:
- Слияния/поглощения компаний (кроме стратегических сигналов)
- Кадровые новости
- Общие рыночные отчёты без конкретики
- AI-продукты для других отраслей
- Общие статьи про AI без привязки к travel`,
  },
};

// ── Load sources from DB (fallback to hardcoded) ────────────────────────────

async function loadDomainsFromDB(): Promise<Record<string, DomainSource>> {
  try {
    const { rows } = await pool.query<{
      url: string; source_type: string; domain: string;
      label: string; search_query: string | null; ai_filter: string | null;
    }>(
      `SELECT url, source_type, domain, label, search_query, ai_filter
       FROM intelligence_sources WHERE active = true ORDER BY domain, created_at`
    );

    if (rows.length === 0) return FALLBACK_DOMAINS;

    const domains: Record<string, DomainSource> = {};

    for (const row of rows) {
      if (!domains[row.domain]) {
        domains[row.domain] = { label: '', rss: [], search_query: '', ai_filter: '' };
      }
      const d = domains[row.domain];

      if (row.source_type === 'rss') {
        d.rss.push(row.url);
        if (!d.label) d.label = row.domain.replace('_', ' ');
      } else if (row.source_type.startsWith('search_')) {
        if (row.search_query) d.search_query = row.search_query;
        if (row.ai_filter) d.ai_filter = row.ai_filter;
        if (row.label) d.label = row.label;
      }
    }

    return domains;
  } catch (err) {
    console.error('[intelligence] loadDomainsFromDB failed, using fallback:', err instanceof Error ? err.message : err);
    return FALLBACK_DOMAINS;
  }
}

// Track fetch results per-source for DB update
async function updateSourceStatus(url: string, error: string | null): Promise<void> {
  try {
    if (error) {
      await pool.query(
        `UPDATE intelligence_sources
         SET last_error = $1, fetch_error_count = fetch_error_count + 1, updated_at = NOW()
         WHERE url = $2`,
        [error.substring(0, 500), url]
      );
    } else {
      await pool.query(
        `UPDATE intelligence_sources
         SET last_fetched_at = NOW(), last_error = NULL, fetch_error_count = 0, updated_at = NOW()
         WHERE url = $1`,
        [url]
      );
    }
  } catch {
    // non-critical — don't break the cycle
  }
}

// ── RSS Parser (reuses pattern from ExternalResearcher) ──────────────────────

function parseRssItems(xml: string, limit = 8): Array<{ title: string; url: string; snippet: string }> {
  const items: Array<{ title: string; url: string; snippet: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;

  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const title   = (/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i.exec(block) ?? [])[1]?.trim() ?? '';
    const link    = (/<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i.exec(block) ?? [])[1]?.trim() ?? '';
    const descRaw = (/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(block) ?? [])[1]?.trim() ?? '';
    const snippet = descRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 400);

    if (title && link) {
      items.push({ title, url: link, snippet });
    }
  }
  return items;
}

// Also handle Atom feeds (used by some sources like HuggingFace)
function parseAtomEntries(xml: string, limit = 8): Array<{ title: string; url: string; snippet: string }> {
  const items: Array<{ title: string; url: string; snippet: string }> = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;

  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const title   = (/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i.exec(block) ?? [])[1]?.trim() ?? '';
    const linkMatch = /<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(block);
    const link    = linkMatch?.[1]?.trim() ?? '';
    const summary = (/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i.exec(block) ?? [])[1]?.trim() ?? '';
    const snippet = summary.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 400);

    if (title && link) {
      items.push({ title, url: link, snippet });
    }
  }
  return items;
}

async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
    } catch (err) {
      lastErr = err;
      if (i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

async function fetchFeed(url: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  try {
    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'TourHab-Intelligence/1.0' },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Detect RSS vs Atom
    if (xml.includes('<entry>')) {
      return parseAtomEntries(xml);
    }
    return parseRssItems(xml);
  } catch (err) {
    console.error(`[intelligence] fetchFeed failed for ${url}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Search APIs (Tavily / Brave) ─────────────────────────────────────────────

async function searchTavily(query: string): Promise<RawSignal[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_domains: [],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: Array<{ title: string; url: string; content: string }> };
    return (data.results ?? []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content.substring(0, 400),
      source: 'tavily',
    }));
  } catch (err) {
    console.error('[intelligence] searchTavily failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

async function searchBrave(query: string): Promise<RawSignal[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&country=ru`;
    const res = await fetch(url, {
      headers: { 'X-Subscription-Token': key },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
    return (data.web?.results ?? []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.description ?? '',
      source: 'brave',
    }));
  } catch (err) {
    console.error('[intelligence] searchBrave failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Competitor page scraping via Firecrawl ───────────────────────────────────

const COMPETITOR_URLS = [
  'https://explore-kamchatka.ru',
  'https://kam.tours',
  'https://kamchatkaland.ru',
];

async function scrapeCompetitorPages(): Promise<RawSignal[]> {
  if (!firecrawlAvailable()) return [];

  const results = await Promise.allSettled(
    COMPETITOR_URLS.map(async (url) => {
      const page = await firecrawlScrape(url);
      if (!page?.markdown) return [] as RawSignal[];

      const host = new URL(url).hostname;
      const excerpt = page.markdown
        .replace(/#+\s*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, 800);

      return [{
        title: page.metadata.title ?? host,
        url,
        snippet: excerpt,
        source: `firecrawl:${host}`,
      }] as RawSignal[];
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<RawSignal[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// ── Core Intelligence Gathering ──────────────────────────────────────────────

async function gatherDomain(domainKey: string, config: DomainSource): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];

  // 1. Try premium search APIs first
  const tavily = await searchTavily(config.search_query);
  if (tavily.length > 0) {
    signals.push(...tavily);
  } else {
    const brave = await searchBrave(config.search_query);
    signals.push(...brave);
  }

  // 2. Firecrawl competitor pages (только для домена competitors)
  if (domainKey === 'competitors') {
    const competitorSignals = await scrapeCompetitorPages();
    signals.push(...competitorSignals);
  }

  // 3. Always fetch RSS (free, complementary data)
  const rssPromises = config.rss.map(url =>
    fetchFeed(url).then(items => {
      updateSourceStatus(url, null);
      return items.map(item => ({ ...item, source: new URL(url).hostname }));
    }).catch((err) => {
      updateSourceStatus(url, err instanceof Error ? err.message : String(err));
      return [] as RawSignal[];
    })
  );
  const rssResults = await Promise.allSettled(rssPromises);

  for (const result of rssResults) {
    if (result.status === 'fulfilled') {
      signals.push(...result.value);
    }
  }

  return signals;
}

// ── AI Analysis ──────────────────────────────────────────────────────────────

async function analyzeSignals(
  domainKey: string,
  config: DomainSource,
  signals: RawSignal[],
): Promise<IntelligenceFinding | null> {
  if (signals.length === 0) return null;

  const snippets = signals
    .slice(0, 12)
    .map((s, i) => `[${i + 1}] ${s.title}\n    ${s.snippet}\n    src: ${s.source}`)
    .join('\n\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты аналитик travel-tech индустрии. Работаешь на владельца AI-платформы TourHab (Камчатка, Россия).
Платформа: Next.js 15, 13 AI-агентов, 260+ маршрутов, Kuzmich AI-бот, маркетплейс операторов.
Стек: Next.js + PostgreSQL + Claude/GPT/Gemini API. Деплой на Timeweb.

Твоя задача: найти новые фичи/паттерны которые можно реализовать у себя.

Для каждой релевантной новости выдели:
1. Что конкретно внедрили? (1-2 предложения)
2. Какую пользовательскую боль это решает?
3. Можно ли реализовать в Next.js + Claude API + Postgres?
4. Приоритет для нас: высокий / средний / низкий

Критерии фильтрации:
${config.ai_filter}

Формат ответа (строго JSON):
{
  "summary": "Что внедрили + какую боль решает (1-2 предложения)",
  "urgency": "critical | notable | informational",
  "action_items": ["[высокий|средний|низкий] — конкретное действие для TourHab"]
}

Правила:
- "critical" = лидер внедрил фичу, мы теряем конкурентное преимущество
- "notable" = полезный паттерн, стоит рассмотреть в следующем спринте
- "informational" = контекст, без прямого действия
- action_items = максимум 3, начинаются с приоритета в квадратных скобках
- Игнорируй: слияния/поглощения (кроме стратегических), кадровые новости, общие отчёты без конкретики, AI-продукты для других отраслей
- Если ничего релевантного — верни {"summary": "null", "urgency": "informational", "action_items": []}
- Отвечай ТОЛЬКО JSON, без markdown-обёртки`,
    },
    {
      role: 'user',
      content: `Домен: ${config.label}\n\nСигналы:\n${snippets}`,
    },
  ];

  try {
    const text = await callAIWithModelDirect(messages, 'google/gemini-2.0-flash-001');
    if (!text) return null;

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr) as {
      summary: string;
      urgency: string;
      action_items: string[];
    };

    if (parsed.summary === 'null' || !parsed.summary) return null;

    const urgency = ['critical', 'notable', 'informational'].includes(parsed.urgency)
      ? parsed.urgency as IntelligenceFinding['urgency']
      : 'informational';

    return {
      domain: domainKey as IntelligenceFinding['domain'],
      summary: parsed.summary,
      signals,
      urgency,
      action_items: Array.isArray(parsed.action_items)
        ? parsed.action_items.slice(0, 3)
        : [],
    };
  } catch (err) {
    console.error('[intelligence] AI analysis failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Telegram Notification ────────────────────────────────────────────────────

async function sendTelegramAlert(findings: IntelligenceFinding[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const domainLabels: Record<string, string> = {
    ai_tech: 'AI & Tech',
    travel_industry: 'Travel',
    competitors: 'Competitors',
    travel_ai: 'Travel-AI Фичи',
  };

  const lines: string[] = ['<b>Intelligence Report</b>', ''];

  for (const f of findings) {
    const icon = f.urgency === 'critical' ? '!' : f.urgency === 'notable' ? '*' : '-';
    lines.push(`<b>[${icon}] ${domainLabels[f.domain] ?? f.domain}</b>`);
    lines.push(f.summary);
    if (f.action_items.length > 0) {
      f.action_items.forEach(a => lines.push(`  -> ${a}`));
    }
    lines.push('');
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join('\n').substring(0, 4000),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  }).catch(() => {});
}

// ── Main Service ─────────────────────────────────────────────────────────────

export async function runIntelligenceCycle(): Promise<IntelligenceReport> {
  const start = Date.now();
  const findings: IntelligenceFinding[] = [];
  let rawCount = 0;

  // Load domains from DB (falls back to hardcoded if table doesn't exist)
  const intelligenceDomains = await loadDomainsFromDB();

  // Gather all domains in parallel
  const domainEntries = Object.entries(intelligenceDomains);
  const gatherResults = await Promise.allSettled(
    domainEntries.map(async ([key, config]) => {
      const signals = await gatherDomain(key, config);

      // ── travel_ai enrichment: add HN + Firecrawl sources ──
      if (key === 'travel_ai') {
        const extraSignals = await gatherTravelAIExtra();
        signals.push(...extraSignals);
        rawCount += extraSignals.length;
      }

      rawCount += signals.length;
      const finding = await analyzeSignals(key, config, signals);
      return finding;
    })
  );

  for (const result of gatherResults) {
    if (result.status === 'fulfilled' && result.value) {
      findings.push(result.value);
    }
  }

  // Store findings in agent_memory (evo agent)
  const dateKey = new Date().toISOString().slice(0, 13).replace('T', '_'); // e.g. 2026-03-31_12

  for (const f of findings) {
    await agentMemory.remember({
      agent_id: 'evo',
      memory_type: 'intelligence',
      key: `intel_${f.domain}_${dateKey}`,
      value: {
        domain: f.domain,
        summary: f.summary,
        urgency: f.urgency,
        action_items: f.action_items,
        signal_count: f.signals.length,
      },
      confidence: f.urgency === 'critical' ? 0.95 : f.urgency === 'notable' ? 0.8 : 0.6,
      source: 'intelligence_cron',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Write-through to permanent knowledge brain
    const intelSlug = `intel/${f.domain}/${new Date().toISOString().slice(0, 7)}`;
    await knowledgeBase.upsert({
      slug: intelSlug,
      type: 'intel',
      title: `${f.domain} intelligence ${new Date().toISOString().slice(0, 7)}`,
      compiled_truth: f.summary,
      metadata: { urgency: f.urgency, signal_count: f.signals.length, action_items: f.action_items },
      agent_id: 'evo',
    });
    await knowledgeBase.appendTimeline(intelSlug, `[${f.urgency}] ${f.summary.slice(0, 200)}`);
  }

  // Send Telegram if any critical or notable findings
  const important = findings.filter(f => f.urgency === 'critical' || f.urgency === 'notable');
  if (important.length > 0) {
    await sendTelegramAlert(important);
  }

  // Publish AI news to public AI channel
  const aiFindings = findings.filter(f => f.domain === 'ai_tech' && (f.urgency === 'critical' || f.urgency === 'notable'));
  for (const f of aiFindings) {
    await postAINewsToChannel(f).catch(err => {
      console.error('[intelligence] AI news publish failed:', err instanceof Error ? err.message : err);
    });
  }

  // Publish travel industry news to TourHub channel
  const travelFindings = findings.filter(f => f.domain === 'travel_industry' && (f.urgency === 'critical' || f.urgency === 'notable'));
  for (const f of travelFindings) {
    await postTravelNewsToChannel(f).catch(err => {
      console.error('[intelligence] Travel news publish failed:', err instanceof Error ? err.message : err);
    });
  }

  return {
    timestamp: new Date().toISOString(),
    domains: findings,
    raw_count: rawCount,
    duration_ms: Date.now() - start,
  };
}

// ── Manual Signal Injection ──────────────────────────────────────────────────

export interface ManualIntelResult {
  ok: boolean;
  domain: string;
  summary: string;
  urgency: string;
  action_items: string[];
  key: string;
}

/**
 * Inject manual intelligence signal (news, article, insights) into agent_memory.
 * Scout reads it on the next run and generates evolution proposals.
 *
 * @param content - raw text of the signal (news article, analysis, etc.)
 * @param topic   - label for the signal (e.g. "Anthropic April 2026")
 * @param domain  - domain classification (default: 'ai_tech')
 */
export async function injectManualIntel(
  content: string,
  topic: string,
  domain: 'ai_tech' | 'travel_industry' | 'competitors' | 'travel_ai' = 'ai_tech',
): Promise<ManualIntelResult> {
  const domainConfig = FALLBACK_DOMAINS[domain];

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты аналитик travel-tech индустрии. Работаешь на владельца AI-платформы TourHab (Камчатка, Россия).
Платформа: Next.js 15, 13 AI-агентов, 260+ маршрутов, Kuzmich AI-бот, маркетплейс операторов.
Стек: Next.js + PostgreSQL + Claude/GPT/Gemini API. Деплой на Timeweb.

Из входящего текста найди фичи/паттерны которые можно реализовать у себя.

Для каждой релевантной идеи:
1. Что конкретно внедрили? (1-2 предложения)
2. Какую пользовательскую боль это решает?
3. Можно ли реализовать в Next.js + Claude API + Postgres?
4. Приоритет: высокий / средний / низкий

Формат ответа (строго JSON):
{
  "summary": "Что внедрили + какую боль решает (1-2 предложения)",
  "urgency": "critical | notable | informational",
  "action_items": ["[высокий|средний|низкий] — конкретное действие для TourHab"]
}

Правила:
- "critical" = лидер внедрил фичу, мы теряем конкурентное преимущество
- "notable" = полезный паттерн для следующего спринта
- "informational" = контекст
- Игнорируй: слияния, кадровые новости, общие отчёты без конкретики, AI для других отраслей
- action_items максимум 3, начинаются с приоритета в квадратных скобках
- Отвечай ТОЛЬКО JSON, без markdown-обёртки`,
    },
    {
      role: 'user',
      content: `Тема: ${topic}\nДомен: ${domainConfig?.label ?? domain}\n\nКонтент:\n${content.substring(0, 6000)}`,
    },
  ];

  const text = await callAIWithModelDirect(messages, 'google/gemini-2.0-flash-001').catch(() => null);

  let summary = `Ручной сигнал: ${topic}`;
  let urgency: IntelligenceFinding['urgency'] = 'notable';
  let actionItems: string[] = [];

  if (text) {
    try {
      const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(jsonStr) as { summary?: string; urgency?: string; action_items?: string[] };
      if (parsed.summary) summary = parsed.summary;
      if (['critical', 'notable', 'informational'].includes(parsed.urgency ?? '')) {
        urgency = parsed.urgency as IntelligenceFinding['urgency'];
      }
      if (Array.isArray(parsed.action_items)) {
        actionItems = parsed.action_items.slice(0, 3);
      }
    } catch { /* keep defaults */ }
  }

  const dateKey = new Date().toISOString().slice(0, 13).replace('T', '_');
  const key = `intel_manual_${domain}_${dateKey}`;

  await agentMemory.remember({
    agent_id: 'evo',
    memory_type: 'intelligence',
    key,
    value: {
      domain,
      summary,
      urgency,
      action_items: actionItems,
      signal_count: 1,
      source_topic: topic,
      injected_manually: true,
    },
    confidence: urgency === 'critical' ? 0.95 : urgency === 'notable' ? 0.85 : 0.7,
    source: 'manual_injection',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  return { ok: true, domain, summary, urgency, action_items: actionItems, key };
}

/**
 * Extra gathering for travel_ai domain: HackerNews Algolia + Firecrawl.
 * Called after standard RSS gathering.
 */
async function gatherTravelAIExtra(): Promise<RawSignal[]> {
  const results: RawSignal[] = [];

  // 1. HN searches (Algolia API — no auth needed)
  const [hnTravel, hnAgent] = await Promise.allSettled([
    searchHackerNews('travel AI'),
    searchHackerNews('AI agent travel planning'),
  ]);

  if (hnTravel.status === 'fulfilled') results.push(...hnTravel.value);
  if (hnAgent.status === 'fulfilled') results.push(...hnAgent.value);

  // 2. Firecrawl for Cloudflare-blocked sites
  if (firecrawlAvailable()) {
    const fcUrls = [
      { url: MINDTRIP_BLOG, source: 'mindtrip' },
      { url: PHOCUSWIRE, source: 'phocuswire' },
      { url: AMADEUS_BLOG, source: 'amadeus' },
      { url: TAAFT_NEWSLETTER, source: 'taaft' },
    ];

    const fcResults = await Promise.allSettled(
      fcUrls.map(async ({ url, source }) => {
        const page = await firecrawlScrape(url);
        if (!page?.markdown) return [] as RawSignal[];

        // Extract top headlines/links from the page
        const lines = page.markdown.split('\n').filter(l => l.trim());
        const topLines = lines.slice(0, 50).join('\n').substring(0, 2000);

        return [{
          title: page.metadata.title ?? source,
          url,
          snippet: topLines,
          source: `firecrawl:${source}`,
        }] as RawSignal[];
      }),
    );

    for (const r of fcResults) {
      if (r.status === 'fulfilled') results.push(...r.value);
    }
  }

  return results;
}

/**
 * Get latest intelligence for Board of Directors context.
 * Reads from agent_memory (last 24h).
 */
export async function getLatestIntelligence(): Promise<string> {
  const memories = await agentMemory.recall('evo', 'intelligence', 10);

  if (!memories || memories.length === 0) {
    return 'Intelligence: no recent data.';
  }

  const lines: string[] = ['Recent Intelligence:'];
  for (const m of memories) {
    const v = m.value as { domain?: string; summary?: string; urgency?: string; action_items?: string[] };
    const urgencyTag = v.urgency === 'critical' ? '[!]' : v.urgency === 'notable' ? '[*]' : '[-]';
    lines.push(`${urgencyTag} ${v.domain ?? '?'}: ${v.summary ?? 'no summary'}`);
    if (v.action_items && v.action_items.length > 0) {
      v.action_items.forEach(a => lines.push(`  -> ${a}`));
    }
  }

  return lines.join('\n');
}
