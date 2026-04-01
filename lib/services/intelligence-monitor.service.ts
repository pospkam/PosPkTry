/**
 * lib/services/intelligence-monitor.service.ts
 *
 * Automated intelligence monitoring — 3 domains:
 *   1. AI & Tech — new models, tools, frameworks, agents
 *   2. Travel Industry — trends, regulations, market shifts
 *   3. Competitors — Kamchatka tourism platforms, pricing, features
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
import type { ChatMessage } from '@/lib/ai/prompts';

// ── Types ────────────────────────────────────────────────────────────────────

interface RawSignal {
  title:   string;
  url:     string;
  snippet: string;
  source:  string;
}

interface IntelligenceFinding {
  domain:     'ai_tech' | 'travel_industry' | 'competitors';
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

const INTELLIGENCE_DOMAINS: Record<string, DomainSource> = {
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
};

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

async function fetchFeed(url: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TourHab-Intelligence/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Detect RSS vs Atom
    if (xml.includes('<entry>')) {
      return parseAtomEntries(xml);
    }
    return parseRssItems(xml);
  } catch {
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
  } catch {
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
  } catch {
    return [];
  }
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

  // 2. Always fetch RSS (free, complementary data)
  const rssPromises = config.rss.map(url =>
    fetchFeed(url).then(items =>
      items.map(item => ({ ...item, source: new URL(url).hostname }))
    ).catch(() => [] as RawSignal[])
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
      content: `Ты аналитик разведки туристической AI-платформы TourHab (Камчатка, Россия).
Платформа: Next.js 15, 10 AI-агентов, 260+ маршрутов, TravelPayouts affiliate.
Работает в условиях РФ-санкций (~35 из 69 сервисов TravelPayouts заблокированы).

Твоя задача: из сырых сигналов выделить ACTIONABLE intelligence.

Критерии фильтрации:
${config.ai_filter}

Формат ответа (строго JSON):
{
  "summary": "2-3 предложения: главное из этого домена",
  "urgency": "critical | notable | informational",
  "action_items": ["конкретное действие 1", "конкретное действие 2"]
}

Правила:
- "critical" = нужно реагировать в течение 24ч (новая регуляция, падение конкурента, прорывная технология)
- "notable" = важно знать, но не срочно (тренд, новый инструмент, ценовой сдвиг)
- "informational" = для контекста, действий не требует
- action_items = максимум 3, каждый начинается с глагола
- Если ничего релевантного — верни {"summary": "null", "urgency": "informational", "action_items": []}
- Отвечай ТОЛЬКО JSON, без markdown-обёртки`,
    },
    {
      role: 'user',
      content: `Домен: ${config.label}\n\nСигналы:\n${snippets}`,
    },
  ];

  try {
    const text = await callAIWithModelDirect(messages, 'fast');
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
  } catch {
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

  // Gather all domains in parallel
  const domainEntries = Object.entries(INTELLIGENCE_DOMAINS);
  const gatherResults = await Promise.allSettled(
    domainEntries.map(async ([key, config]) => {
      const signals = await gatherDomain(key, config);
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
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  }

  // Send Telegram if any critical or notable findings
  const important = findings.filter(f => f.urgency === 'critical' || f.urgency === 'notable');
  if (important.length > 0) {
    await sendTelegramAlert(important);
  }

  return {
    timestamp: new Date().toISOString(),
    domains: findings,
    raw_count: rawCount,
    duration_ms: Date.now() - start,
  };
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
