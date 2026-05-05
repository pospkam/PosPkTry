/**
 * lib/agents/visitkamchatka-importer.ts
 *
 * Импортирует паспорта маршрутов с visitkamchatka.ru/routes/
 * Источник: официальный туристический портал Камчатского края.
 *
 * Алгоритм:
 * 1. Парсит индексную страницу → список slug'ов маршрутов
 * 2. Для каждого маршрута фетчит HTML → парсит паспортные данные
 * 3. Upsert в agent_route_knowledge по route_dedupe_key
 *
 * Лимит: 20 маршрутов за запуск (настраивается)
 */

// jsdom has no @types package — use dynamic require with explicit cast
const JSDOM = (require('jsdom') as any).JSDOM as new (html: string) => { window: { document: Document } };
import { createHash } from 'crypto';
import { pool } from '@/lib/db-pool';

const BASE = 'https://visitkamchatka.ru';
const SOURCE_NAME = 'visitkamchatka.ru';
const BATCH = 20;

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}

interface RoutePassport {
  slug: string;
  url: string;
  title: string;
  description: string;
  distance_km: number | null;
  duration_h: number | null;
  difficulty: string | null;
  season: string | null;
  lat: number | null;
  lng: number | null;
  activity_type: string | null;
  category: string | null;
  hazards: string | null;
}

// ── Определить activity_type по данным маршрута ────────────────────

function inferActivity(title: string, description: string, slug: string): string | null {
  const text = `${title} ${description} ${slug}`.toLowerCase();
  if (text.includes('вулкан') || text.includes('вулкан') || text.includes('volcano')) return 'volcano';
  if (text.includes('термальн') || text.includes('источник') || text.includes('thermal')) return 'thermal';
  if (text.includes('рыбалк') || text.includes('fishing')) return 'fishing';
  if (text.includes('медвед') || text.includes('bear')) return 'bears';
  if (text.includes('морск') || text.includes('ocean') || text.includes('пляж') || text.includes('beach')) return 'boat_trip';
  if (text.includes('трекинг') || text.includes('поход') || text.includes('trekking')) return 'trekking';
  if (text.includes('рафтинг')) return 'rafting';
  if (text.includes('снегоход')) return 'snowmobile';
  if (text.includes('вертолёт') || text.includes('вертолет')) return 'helicopter';
  if (text.includes('лыж')) return 'ski';
  return 'trekking';
}

// ── Парсить координаты из текста ───────────────────────────────────

function parseCoords(text: string): { lat: number | null; lng: number | null } {
  // Formats: "52.963036, 158.708946" or "53°10'N 158°20'E"
  const decimalMatch = text.match(/(\d{2,3}[.,]\d{4,})[,\s]+(\d{2,3}[.,]\d{4,})/);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1].replace(',', '.'));
    const lng = parseFloat(decimalMatch[2].replace(',', '.'));
    if (lat >= 50 && lat <= 62 && lng >= 155 && lng <= 165) {
      return { lat, lng };
    }
  }
  return { lat: null, lng: null };
}

// ── Извлечь число из строки (дистанция, длительность) ─────────────

function extractNumber(text: string): number | null {
  const m = text.match(/[\d,\.]+/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ── Получить список slug'ов с индексной страницы ──────────────────

async function fetchRouteSlugsList(page = 1): Promise<string[]> {
  const url = page === 1 ? `${BASE}/routes/` : `${BASE}/routes/?page=${page}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TourHabBot/1.0 (tourhab.ru; route enrichment)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const slugs: string[] = [];
  // Links matching /routes/[slug]/
  doc.querySelectorAll('a[href]').forEach((el: Element) => {
    const href = (el as HTMLAnchorElement).href || el.getAttribute('href') || '';
    const m = href.match(/\/routes\/([^/?#]+)\/?$/);
    if (m && m[1] && m[1] !== 'routes') {
      slugs.push(m[1]);
    }
  });

  return [...new Set(slugs)];
}

// ── Парсить паспорт маршрута с индивидуальной страницы ─────────────

async function fetchRoutePassport(slug: string): Promise<RoutePassport | null> {
  const url = `${BASE}/routes/${slug}/`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TourHabBot/1.0 (tourhab.ru; route enrichment)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Title
    const h1 = doc.querySelector('h1');
    const title = h1?.textContent?.trim() ?? slug.replace(/-/g, ' ');

    // Main description — first substantial paragraphs
    const paragraphs: string[] = [];
    doc.querySelectorAll('p, .route-description, .description, article p').forEach((el: Element) => {
      const text = el.textContent?.trim() ?? '';
      if (text.length > 50) paragraphs.push(text);
    });
    const description = paragraphs.slice(0, 6).join('\n\n');

    // Structured fields from tables / definition lists / info-blocks
    let distance_km: number | null = null;
    let duration_h: number | null = null;
    let difficulty: string | null = null;
    let season: string | null = null;
    let hazards: string | null = null;

    const fullText = doc.body?.textContent ?? '';

    // Distance
    const distMatch = fullText.match(/(?:протяжённость|длина|расстояние)[^:]*[:：]\s*([\d,\. ]+)\s*(?:км|km)/i);
    if (distMatch) distance_km = extractNumber(distMatch[1]);

    // Duration
    const durMatch = fullText.match(/(?:продолжительность|время в пути|длительность)[^:]*[:：]\s*([\d,\. ]+)\s*(?:ч|час|hours?)/i);
    if (durMatch) duration_h = extractNumber(durMatch[1]);

    // Difficulty
    const diffMatch = fullText.match(/(?:сложность|уровень подготовки)[^:]*[:：]\s*([^\n.]+)/i);
    if (diffMatch) difficulty = diffMatch[1].trim().slice(0, 100);

    // Season
    const seasonMatch = fullText.match(/(?:сезон|время посещения|период)[^:]*[:：]\s*([^\n.]+)/i);
    if (seasonMatch) season = seasonMatch[1].trim().slice(0, 100);

    // Hazards
    const hazardMatch = fullText.match(/(?:опасност|риск|предупреждени)[^:]*[:：]\s*([^\n]+)/i);
    if (hazardMatch) hazards = hazardMatch[1].trim().slice(0, 200);

    // Coordinates
    const { lat, lng } = parseCoords(fullText);

    const activity_type = inferActivity(title, description, slug);
    const category = activity_type;

    return { slug, url, title, description, distance_km, duration_h, difficulty, season, lat, lng, activity_type, category, hazards };
  } catch {
    return null;
  }
}

// ── Получить slug'и, которых ещё нет в БД ────────────────────────

async function getNewSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const { rows } = await pool.query<{ dedupe: string }>(
    `SELECT route_dedupe_key AS dedupe FROM agent_route_knowledge
     WHERE source_name = $1 AND route_dedupe_key = ANY($2)`,
    [SOURCE_NAME, slugs.map(s => `vk_${s}`)],
  );
  const existing = new Set(rows.map(r => r.dedupe));
  return slugs.filter(s => !existing.has(`vk_${s}`));
}

// ── Получить slug'и с NULL/короткими описаниями для обновления ────

async function getSlugsNeedingUpdate(limit: number): Promise<string[]> {
  const { rows } = await pool.query<{ route_dedupe_key: string }>(
    `SELECT route_dedupe_key FROM agent_route_knowledge
     WHERE source_name = $1
       AND (description IS NULL OR LENGTH(description) < 300)
       AND route_dedupe_key LIKE 'vk_%'
     ORDER BY RANDOM()
     LIMIT $2`,
    [SOURCE_NAME, limit],
  );
  return rows.map(r => r.route_dedupe_key.replace(/^vk_/, ''));
}

// ── Upsert одного маршрута ────────────────────────────────────────

async function upsertRoute(p: RoutePassport): Promise<'inserted' | 'updated' | 'skipped'> {
  if (!p.description || p.description.length < 80) return 'skipped';

  const dedupeKey = `vk_${p.slug}`;
  const payload = JSON.stringify({
    distance_km: p.distance_km,
    duration_h: p.duration_h,
    difficulty: p.difficulty,
    season: p.season,
    hazards: p.hazards,
  });
  const searchText = [p.title, p.description, p.difficulty, p.season, p.activity_type]
    .filter(Boolean).join(' ').slice(0, 3000);
  const sourceHash = createHash('md5').update(p.description).digest('hex');

  const { rowCount } = await pool.query(
    `INSERT INTO agent_route_knowledge
       (id, route_dedupe_key, title, description, category, activity_type,
        lat, lng, source_url, source_name, search_text, payload, source_hash,
        is_visible, source_updated_at, last_synced_at, created_at, updated_at)
     VALUES (
       gen_random_uuid(), $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10, $11::jsonb, $12,
       true, NOW(), NOW(), NOW(), NOW()
     )
     ON CONFLICT (route_dedupe_key) DO UPDATE SET
       description       = EXCLUDED.description,
       category          = COALESCE(EXCLUDED.category, agent_route_knowledge.category),
       activity_type     = COALESCE(EXCLUDED.activity_type, agent_route_knowledge.activity_type),
       lat               = COALESCE(EXCLUDED.lat, agent_route_knowledge.lat),
       lng               = COALESCE(EXCLUDED.lng, agent_route_knowledge.lng),
       search_text       = EXCLUDED.search_text,
       payload           = EXCLUDED.payload::jsonb,
       source_hash       = EXCLUDED.source_hash,
       last_synced_at    = NOW(),
       updated_at        = NOW()`,
    [dedupeKey, p.title, p.description, p.category, p.activity_type,
     p.lat, p.lng, p.url, SOURCE_NAME, searchText, payload, sourceHash],
  );

  return (rowCount ?? 0) > 0 ? 'inserted' : 'skipped';
}

// ── Главная функция ────────────────────────────────────────────────

export async function runVisitKamchatkaImporter(batchSize = BATCH): Promise<ImportResult> {
  const start = Date.now();
  let inserted = 0, updated = 0, skipped = 0, errors = 0;

  // 1. Получить все slug'и с индексной страницы (до 3 страниц)
  const allSlugs: string[] = [];
  for (let page = 1; page <= 3; page++) {
    const slugs = await fetchRouteSlugsList(page);
    allSlugs.push(...slugs);
    if (slugs.length < 5) break; // нет следующей страницы
  }

  // 2. Разделить: сначала новые, затем требующие обновления
  const newSlugs   = await getNewSlugs([...new Set(allSlugs)]);
  const updateNeeded = await getSlugsNeedingUpdate(batchSize);

  const toProcess = [
    ...newSlugs.slice(0, Math.ceil(batchSize * 0.6)),
    ...updateNeeded.slice(0, Math.floor(batchSize * 0.4)),
  ].slice(0, batchSize);

  // 3. Обработать каждый
  for (const slug of toProcess) {
    const passport = await fetchRoutePassport(slug);
    if (!passport) {
      errors++;
      continue;
    }
    try {
      const result = await upsertRoute(passport);
      if (result === 'inserted') inserted++;
      else if (result === 'updated') updated++;
      else skipped++;
    } catch {
      errors++;
    }
    // Небольшая пауза чтобы не DDoS-ить сайт
    await new Promise(r => setTimeout(r, 300));
  }

  return { inserted, updated, skipped, errors, duration_ms: Date.now() - start };
}
