/**
 * lib/agents/scout-digest.ts
 *
 * Scout Digest — ежедневный разведывательный дайджест.
 * Запускается раз в сутки через /api/cron/scout-digest.
 *
 * Собирает RSS-сигналы из 3 областей:
 *   1. AI & Tech — что нового в AI для применения к платформе
 *   2. Travel Industry — новости туриндустрии РФ
 *   3. Камчатка — конкуренты, спрос, события
 *
 * Синтезирует через AI → отправляет дайджест в Telegram.
 * Хранит результат в agent_memory для истории.
 */

import { callAIFast } from '@/lib/ai/providers';
import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { knowledgeBase } from '@/lib/agents/memory/agent-knowledge';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface DigestResult {
  signals_found: number;
  digest_sent: boolean;
  duration_ms: number;
}

interface RssItem {
  title: string;
  url: string;
  source: string;
}

const RSS_SOURCES = [
  // AI & Tech
  { url: 'https://habr.com/ru/rss/hub/artificial_intelligence/all/?fl=ru', label: 'Habr AI' },
  { url: 'https://habr.com/ru/rss/hub/machine_learning/all/?fl=ru', label: 'Habr ML' },
  // Travel
  { url: 'https://www.rata-news.ru/rss', label: 'RATA' },
  { url: 'https://tourprom.ru/rss', label: 'Tourprom' },
  // Kamchatka
  { url: 'https://www.kamgov.ru/rss', label: 'Kamgov' },
];

async function fetchRssWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      lastErr = err;
      if (i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

async function fetchRss(url: string, label: string): Promise<RssItem[]> {
  try {
    const res = await fetchRssWithRetry(url, {
      headers: { 'User-Agent': 'TourHab/1.0 (Scout Digest)' },
    });
    const xml = await res.text();
    const items: RssItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const block = match[1];
      const title = (/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i.exec(block)?.[1] ?? '').trim();
      const link = (/<link[^>]*>(.*?)<\/link>|<guid[^>]*>(https?[^<]+)<\/guid>/i.exec(block)?.[1] ?? '').trim();
      if (title && title.length > 5) {
        items.push({ title, url: link, source: label });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function tgSend(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.substring(0, 4000),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function runScoutDigest(): Promise<DigestResult> {
  const start = Date.now();

  // Collect RSS in parallel
  const allItems: RssItem[] = [];
  const results = await Promise.allSettled(
    RSS_SOURCES.map(s => fetchRss(s.url, s.label))
  );
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  if (allItems.length === 0) {
    return { signals_found: 0, digest_sent: false, duration_ms: Date.now() - start };
  }

  // AI synthesis
  const signalsList = allItems
    .map(i => `[${i.source}] ${i.title}`)
    .join('\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты разведчик туристической платформы TourHab (Камчатка).
Твоя задача — прочитать сигналы из RSS-лент и выделить 3-5 наиболее важных инсайтов.

СТРОГИЕ ПРАВИЛА ФИЛЬТРАЦИИ:
- Раздел "Камчатка" — ТОЛЬКО материалы про Камчатский край. Любые другие регионы РФ (Татарстан, Сочи, Байкал, Алтай и т.д.) — игнорировать полностью, не упоминать даже как аналогию.
- Раздел "Туриндустрия" — только про туризм в РФ или глобальные тренды с применимостью к Камчатке. Локальные новости чужих регионов — пропускать.
- Раздел "AI & Tech" — только технологии с реальной применимостью к туристической платформе. Абстрактные AI-эксперименты без связи с туризмом — пропускать.
- Если по какому-то разделу нет релевантных сигналов — написать "Нет значимых сигналов за сегодня" вместо высасывания нерелевантного контента.

Формат ответа — только HTML для Telegram, без markdown:
<b>Дайджест [дата]</b>

<b>AI & Tech</b>
- [краткий инсайт 1-2 предложения, что это значит для платформы]

<b>Туриндустрия</b>
- [краткий инсайт]

<b>Камчатка</b>
- [краткий инсайт про Камчатский край]

Пиши по-русски. Только факты и их применимость к TourHab. Без воды. Лучше меньше инсайтов но все релевантные, чем много но мусорных.`,
    },
    {
      role: 'user',
      content: `Сигналы за ${new Date().toLocaleDateString('ru-RU')}:\n\n${signalsList}`,
    },
  ];

  let digest: string | null = null;
  try {
    digest = await callAIFast(messages);
  } catch {
    digest = null;
  }

  if (!digest) {
    return { signals_found: allItems.length, digest_sent: false, duration_ms: Date.now() - start };
  }

  const sent = await tgSend(digest);

  // Store permanently in knowledge brain
  try {
    const dateKey = new Date().toISOString().slice(0, 10);
    const slug = `intel/scout/${dateKey}`;
    await knowledgeBase.upsert({
      slug,
      type: 'intel',
      title: `Scout Digest ${dateKey}`,
      compiled_truth: digest,
      metadata: { signals: allItems.length, sources: RSS_SOURCES.map(s => s.label), sent_to_tg: sent },
      agent_id: 'scout',
    });
    // Also keep short-term memory for agents that scan recent intel
    await agentMemory.remember({
      agent_id: 'evo',
      memory_type: 'intelligence',
      key: `scout_digest_${dateKey}`,
      value: { slug, signals: allItems.length, sources: RSS_SOURCES.map(s => s.label) },
      confidence: 0.8,
      source: 'scout_digest_cron',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  } catch {
    // Non-critical
  }

  return { signals_found: allItems.length, digest_sent: sent, duration_ms: Date.now() - start };
}
