/**
 * lib/agents/places-enricher.ts
 *
 * Обогащает места Камчатки реальными описаниями.
 *
 * Алгоритм:
 * 1. Скачивает страницы с описаниями мест с нескольких Камчатских сайтов
 * 2. Извлекает пары (название → описание)
 * 3. Сопоставляет с записями в agent_route_knowledge по заголовку
 * 4. Каждое описание прогоняет через AI-рерайт (сохранить факты, свои слова)
 * 5. Сохраняет БЕЗ source_url (нет ссылок на источники)
 *
 * Источники: extraguide.ru, tur-ray.ru, spkam.com, bolshayastrana.com
 */

import { pool } from '@/lib/db-pool';
import { callDeepSeek } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

const JSDOM = (require('jsdom') as any).JSDOM as new (html: string) => { window: { document: Document } };

export interface PlacesEnricherResult {
  matched: number;
  enriched: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}

interface PlaceDesc {
  title: string;
  description: string;
}

// ── Скрейп источников ─────────────────────────────────────────────

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function scrapeExtraguide(): Promise<PlaceDesc[]> {
  const html = await fetchPage('https://extraguide.ru/russia/kamchatka/sights/');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const results: PlaceDesc[] = [];

  doc.querySelectorAll('h2, h3').forEach((heading: Element) => {
    const title = heading.textContent?.trim() ?? '';
    if (!title || title.length < 3) return;
    // Берём текст следующих параграфов
    const paragraphs: string[] = [];
    let next = heading.nextElementSibling;
    while (next && !['H2', 'H3'].includes(next.tagName) && paragraphs.join('').length < 1000) {
      if (next.tagName === 'P') {
        const t = next.textContent?.trim() ?? '';
        if (t.length > 30) paragraphs.push(t);
      }
      next = next.nextElementSibling;
    }
    if (paragraphs.length > 0) {
      results.push({ title, description: paragraphs.join(' ') });
    }
  });

  return results;
}

async function scrapeTurRay(): Promise<PlaceDesc[]> {
  const html = await fetchPage('https://tur-ray.ru/dostoprimechatelnosti-kamchatki.html');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const results: PlaceDesc[] = [];

  doc.querySelectorAll('h2, h3').forEach((heading: Element) => {
    const title = heading.textContent?.replace(/\d+\./g, '').trim() ?? '';
    if (!title || title.length < 5) return;
    const paragraphs: string[] = [];
    let next = heading.nextElementSibling;
    while (next && !['H2', 'H3'].includes(next.tagName) && paragraphs.join('').length < 1000) {
      if (next.tagName === 'P') {
        const t = next.textContent?.trim() ?? '';
        if (t.length > 30) paragraphs.push(t);
      }
      next = next.nextElementSibling;
    }
    if (paragraphs.length > 0) {
      results.push({ title, description: paragraphs.join(' ') });
    }
  });

  return results;
}

async function scrapeSpkam(): Promise<PlaceDesc[]> {
  const html = await fetchPage('https://spkam.com/stati-o-kamchatke/dostoprimechatelnosti/');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const results: PlaceDesc[] = [];

  doc.querySelectorAll('h2, h3').forEach((heading: Element) => {
    const title = heading.textContent?.replace(/^\d+\.\s*/, '').trim() ?? '';
    if (!title || title.length < 5) return;
    const paragraphs: string[] = [];
    let next = heading.nextElementSibling;
    while (next && !['H2', 'H3'].includes(next.tagName) && paragraphs.join('').length < 800) {
      if (next.tagName === 'P') {
        const t = next.textContent?.trim() ?? '';
        if (t.length > 30) paragraphs.push(t);
      }
      next = next.nextElementSibling;
    }
    if (paragraphs.length > 0) {
      results.push({ title, description: paragraphs.join(' ') });
    }
  });

  return results;
}

// ── Нечёткое сопоставление названий ──────────────────────────────

function normalizeTitle(t: string): string {
  return t.toLowerCase()
    .replace(/вулкан\s+|гора\s+|озеро\s+|река\s+|мыс\s+|бухта\s+|природный\s+парк\s+/gi, '')
    .replace(/[^\wа-яё\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wordsA = new Set(na.split(' ').filter(w => w.length > 3));
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 3));
  const common = [...wordsA].filter(w => wordsB.has(w)).length;
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 ? common / total : 0;
}

// ── AI-рерайт описания ─────────────────────────────────────────────

async function rewriteDescription(title: string, rawDesc: string): Promise<string | null> {
  if (rawDesc.trim().length < 100) return null;
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты редактор туристической платформы TourHab (Камчатка).
Задача: перефразировать описание природного объекта своими словами, сохранив все факты и детали.
Стиль: живой, точный, без рекламных штампов, без emoji, без markdown.
Объём: 2-3 абзаца, 150-280 слов. Отвечай только переписанным текстом, без вступлений.`,
    },
    {
      role: 'user',
      content: `Объект: ${title}\n\nИсходный текст:\n${rawDesc.slice(0, 1500)}`,
    },
  ];
  try {
    const result = await callDeepSeek(messages);
    return result?.trim() ?? null;
  } catch (e) {
    process.stdout.write(`  rewrite error: ${e instanceof Error ? e.message : String(e)}\n`);
    return null;
  }
}

// ── Загрузить места из БД без описания ────────────────────────────

interface DBPlace {
  id: string;
  title: string;
}

async function loadPlacesNeedingDesc(limit: number): Promise<DBPlace[]> {
  const { rows } = await pool.query<DBPlace>(
    `SELECT id, title FROM agent_route_knowledge
     WHERE kind = 'place'
       AND (description IS NULL OR LENGTH(description) < 300)
       AND title NOT ILIKE '%экскурси%'
       AND title NOT ILIKE '%маршрут%'
       AND title NOT ILIKE '%восхождени%'
       AND title NOT ILIKE '%забег%'
       AND title NOT ILIKE '%приключени%'
       AND title NOT ILIKE '%вид на%'
       AND LENGTH(title) > 5
     ORDER BY RANDOM()
     LIMIT $1`,
    [limit],
  );
  return rows;
}

// ── Сохранить описание в БД ────────────────────────────────────────

async function saveDescription(id: string, description: string): Promise<void> {
  await pool.query(
    `UPDATE agent_route_knowledge
     SET description = $1,
         search_text = COALESCE(search_text, '') || ' ' || $1,
         source_url  = NULL,
         updated_at  = NOW()
     WHERE id = $2`,
    [description, id],
  );
}

// ── Главная функция ────────────────────────────────────────────────

export async function runPlacesEnricher(batchSize = 30): Promise<PlacesEnricherResult> {
  const start = Date.now();
  let matched = 0, enriched = 0, skipped = 0, errors = 0;

  // 1. Загрузить описания из источников
  const sourceDescs: PlaceDesc[] = [];
  for (const scraper of [scrapeExtraguide, scrapeTurRay, scrapeSpkam]) {
    try {
      const items = await scraper();
      sourceDescs.push(...items);
    } catch {
      // не критично — продолжаем
    }
  }

  if (sourceDescs.length === 0) {
    return { matched: 0, enriched: 0, skipped: 0, errors: 1, duration_ms: Date.now() - start };
  }

  // 2. Загрузить места из БД
  const dbPlaces = await loadPlacesNeedingDesc(Math.min(batchSize * 5, 300));

  // 3. Сопоставить и обогатить
  let processed = 0;
  for (const place of dbPlaces) {
    if (processed >= batchSize) break;

    // Найти лучшее совпадение в источниках
    let bestMatch: PlaceDesc | null = null;
    let bestScore = 0;
    for (const src of sourceDescs) {
      const score = titleSimilarity(place.title, src.title);
      if (score > bestScore && score >= 0.65) {
        bestScore = score;
        bestMatch = src;
      }
    }

    if (!bestMatch) {
      skipped++;
      continue;
    }

    matched++;
    processed++;

    try {
      const rewritten = await rewriteDescription(place.title, bestMatch.description);
      if (!rewritten || rewritten.length < 100) {
        process.stdout.write(`  rewrite empty for "${place.title}" (len=${rewritten?.length ?? 0})\n`);
        skipped++;
        continue;
      }
      await saveDescription(place.id, rewritten);
      enriched++;
    } catch {
      errors++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return { matched, enriched, skipped, errors, duration_ms: Date.now() - start };
}
