/**
 * lib/services/visitkamchatka-importer.ts
 *
 * Импорт официальных маршрутов с visitkamchatka.ru в:
 *   1. kamchatka_routes     — маршруты для публичного каталога
 *   2. agent_route_knowledge — знания Кузьмича
 *
 * Источники:
 *   - /route-passports/ — 134 PDF-паспорта (title + PDF URL)
 *   - /routes/          — 10 HTML-страниц с полными описаниями
 *
 * Запускается через POST /api/admin/import/visitkamchatka (requireAdmin).
 */

import { pool } from '@/lib/db-pool';
import { createHash } from 'crypto';
import { firecrawlScrape, firecrawlAvailable } from '@/lib/services/firecrawl';

const BASE_URL = 'https://visitkamchatka.ru';
const SOURCE_NAME = 'visitkamchatka.ru';

// ── Типы ─────────────────────────────────────────────────────────────────────

export interface ScrapedRoute {
  title: string;
  filename: string;
  pdfUrl: string;
  season: 'summer' | 'winter' | 'all';
  htmlSlug: string | null; // если есть HTML-страница
  description: string | null;
}

export interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  errors: number;
  routes: { title: string; status: string }[];
}

// ── Категория из названия маршрута ────────────────────────────────────────────

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('вулкан') || t.includes('вулкаш')) return 'vulkani';
  if (t.includes('водопад')) return 'vodopady';
  if (t.includes('источник') || t.includes('нарзан') || t.includes('термал')) return 'istochniki';
  if (t.includes('озеро') || t.includes('озёр') || t.includes('lake')) return 'ozera';
  if (t.includes('пляж') || t.includes('океан') || t.includes('тихий')) return 'plyazhi';
  if (t.includes('каньон')) return 'ekskursii';
  if (t.includes('sup') || t.includes('река') || t.includes('рафт')) return 'voda';
  if (t.includes('снегоход') || t.includes('лыж') || t.includes('winter')) return 'zima';
  if (t.includes('медвед') || t.includes('нерка') || t.includes('рыб')) return 'eco';
  if (t.includes('перевал') || t.includes('тропа') || t.includes('поход')) return 'peshie';
  return 'ekskursii';
}

function detectActivityType(title: string, season: string): string {
  const t = title.toLowerCase();
  if (t.includes('sup')) return 'sup';
  if (t.includes('снегоход')) return 'snowmobile';
  if (t.includes('лыж') || t.includes('ski')) return 'ski';
  if (t.includes('джип') || t.includes('авто')) return 'offroad';
  if (season === 'winter') return 'winter_hiking';
  return 'trekking';
}

function toSlug(filename: string): string {
  return 'visitkamchatka-' + filename
    .replace(/\.(pdf|PDF)$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function dedupeKey(filename: string): string {
  return `visitkamchatka.ru:${filename.replace(/\.(pdf|PDF)$/, '').toLowerCase()}`;
}

// ── HTML route pages mapping (slug → title match) ────────────────────────────

const HTML_ROUTES: Record<string, string> = {
  'bukhta-pionerskaya': 'Бухта Пионерская',
  'dachnye-istochniki': 'Дачные источники',
  'ganalskie-vostryaki': 'Ганальские Востряки',
  'golubye-ozera': 'Голубые озера',
  'gornyy-massiv-vachkazhets': 'Горный массив Вачкажец',
  'kamchatskiy-kamen': 'Камчатский камень',
  'mayak-petropavlovskiy-mys-vertikalnyy': 'Маяк Петропавловский – Мыс Вертикальный',
  'mys-mayachnyy': 'Мыс Маячный',
  'vodopad-babiy-kamen': 'Бабий камень',
  'vodopad-snezhnyy-bars-na-ruche-spokoynyy': 'Водопад на ручье Спокойный',
};

// ── Скрапинг списка маршрутов: Firecrawl → markdown, иначе raw HTML ──────────

function parseRoutes(text: string, isMarkdown: boolean): ScrapedRoute[] {
  const seen = new Set<string>();
  const routes: ScrapedRoute[] = [];

  // Markdown pattern: [НАЗВАНИЕ (PDF)](https://visitkamchatka.ru/upload/route_passports/FILE.pdf)
  // HTML pattern:     href="/upload/route_passports/FILE.pdf" ...>НАЗВАНИЕ<
  const re = isMarkdown
    ? /\[([^\]]+?)\]\((https:\/\/visitkamchatka\.ru\/upload\/route_passports\/([^)]+))\)/g
    : /href="(\/upload\/route_passports\/([^"]+))"[^>]*>([\s\S]*?)<\/a>/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const filename = isMarkdown ? m[3] : m[2];
    const rawTitle = isMarkdown
      ? m[1].replace(/\s*\(PDF[^)]*\)/i, '').replace(/\s+/g, ' ').trim()
      : m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/PDF.*/i, '').trim();
    const fullPathOrUrl = isMarkdown ? m[2] : `${BASE_URL}${m[1]}`;

    if (!rawTitle || seen.has(filename)) continue;
    seen.add(filename);

    const fnLow = filename.toLowerCase();
    const season: ScrapedRoute['season'] =
      fnLow.includes('winter') ? 'winter' :
      fnLow.includes('summer') ? 'summer' : 'all';

    const htmlSlug = Object.entries(HTML_ROUTES).find(([, t]) =>
      t.toLowerCase() === rawTitle.toLowerCase()
    )?.[0] ?? null;

    routes.push({
      title: rawTitle,
      filename,
      pdfUrl: fullPathOrUrl,
      season,
      htmlSlug,
      description: null,
    });
  }

  return routes;
}

async function scrapeRouteList(): Promise<ScrapedRoute[]> {
  // Попытка 1: Firecrawl (если ключ есть) — стабильнее к изменениям вёрстки
  if (firecrawlAvailable()) {
    const page = await firecrawlScrape(`${BASE_URL}/route-passports/`);
    if (page && page.markdown) {
      const routes = parseRoutes(page.markdown, true);
      if (routes.length > 10) return routes; // достаточно данных — возвращаем
    }
  }

  // Попытка 2: raw HTML + regex (fallback)
  const resp = await fetch(`${BASE_URL}/route-passports/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 TourhubBot/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from visitkamchatka.ru`);
  const html = await resp.text();
  return parseRoutes(html, false);
}

// ── Скрапинг HTML-описания ────────────────────────────────────────────────────

async function scrapeHtmlDescription(slug: string): Promise<string | null> {
  try {
    const resp = await fetch(`${BASE_URL}/routes/${slug}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 TourhubBot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    // Убираем скрипты и стили
    const clean = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Ищем блок «Краткое описание» или основной текст
    const descMatch = clean.match(/Краткое описание[\s\S]{0,50}<\/[^>]+>([\s\S]{200,2000}?)(?:<h[1-6]|Waypoint|Точки маршрута|Маршрут)/i);
    if (descMatch) {
      return descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200);
    }

    // Fallback — берём весь основной текст страницы
    const bodyMatch = clean.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
      ?? clean.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (bodyMatch) {
      const text = bodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      // Ищем первый длинный абзац после заголовка маршрута
      const start = text.indexOf('Краткое описание');
      const excerpt = start >= 0 ? text.slice(start + 18) : text;
      const meaningful = excerpt.split(/\n/).find(s => s.trim().length > 150) ?? excerpt.slice(0, 600);
      return meaningful.trim().slice(0, 1200) || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// ── INSERT в kamchatka_routes ─────────────────────────────────────────────────

async function upsertKamchatkaRoute(route: ScrapedRoute): Promise<'inserted' | 'updated' | 'skip'> {
  const dk = dedupeKey(route.filename);
  const slug = toSlug(route.filename);
  const category = detectCategory(route.title);
  const metadata = JSON.stringify({
    season: route.season,
    filename: route.filename,
    pdf_url: route.pdfUrl,
    import_source: SOURCE_NAME,
  });

  const { rowCount } = await pool.query(
    `INSERT INTO kamchatka_routes
       (id, dedupe_key, slug, title, description, category, source_url, source_name, metadata, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())
     ON CONFLICT (dedupe_key) DO UPDATE
       SET title       = EXCLUDED.title,
           description = COALESCE(EXCLUDED.description, kamchatka_routes.description),
           source_url  = EXCLUDED.source_url,
           updated_at  = NOW()`,
    [dk, slug, route.title, route.description, category, route.pdfUrl, SOURCE_NAME, metadata],
  );

  return (rowCount ?? 0) > 0 ? 'inserted' : 'skip';
}

// ── INSERT в agent_route_knowledge ────────────────────────────────────────────

async function upsertAgentKnowledge(route: ScrapedRoute): Promise<void> {
  const dk = dedupeKey(route.filename);
  const category = detectCategory(route.title);
  const activityType = detectActivityType(route.title, route.season);
  const searchText = [route.title, 'Камчатка', category, route.season === 'winter' ? 'зима' : route.season === 'summer' ? 'лето' : ''].join(' ');
  const sourceHash = createHash('md5').update(route.title + route.filename).digest('hex');
  const payload = JSON.stringify({
    title: route.title,
    season: route.season,
    pdf_url: route.pdfUrl,
    source: SOURCE_NAME,
    description: route.description ?? null,
  });

  await pool.query(
    `INSERT INTO agent_route_knowledge
       (id, route_dedupe_key, category, title, description, source_url, source_name,
        search_text, payload, source_hash, is_visible, activity_type, zone, kind,
        last_synced_at, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, true, $10, 'avachinsky', 'route', NOW(), NOW(), NOW())
     ON CONFLICT (route_dedupe_key) DO UPDATE
       SET title          = EXCLUDED.title,
           description    = COALESCE(EXCLUDED.description, agent_route_knowledge.description),
           search_text    = EXCLUDED.search_text,
           payload        = EXCLUDED.payload,
           last_synced_at = NOW(),
           updated_at     = NOW()`,
    [dk, category, route.title, route.description, route.pdfUrl, SOURCE_NAME,
     searchText, payload, sourceHash, activityType],
  );
}

// ── Главная функция импорта ───────────────────────────────────────────────────

export async function importVisitKamchatka(): Promise<ImportResult> {
  const routes = await scrapeRouteList();
  const result: ImportResult = {
    total: routes.length,
    inserted: 0,
    updated: 0,
    errors: 0,
    routes: [],
  };

  // Для HTML-маршрутов сначала загружаем описания (параллельно, max 5)
  const withHtml = routes.filter(r => r.htmlSlug);
  const htmlDescs = await Promise.allSettled(
    withHtml.map(r => scrapeHtmlDescription(r.htmlSlug!)),
  );
  withHtml.forEach((r, i) => {
    const res = htmlDescs[i];
    if (res.status === 'fulfilled' && res.value) {
      r.description = res.value;
    }
  });

  // Импортируем по одному (не DDoS)
  for (const route of routes) {
    try {
      const status = await upsertKamchatkaRoute(route);
      await upsertAgentKnowledge(route);
      if (status === 'inserted') result.inserted++;
      else result.updated++;
      result.routes.push({ title: route.title, status });
    } catch (err) {
      result.errors++;
      result.routes.push({
        title: route.title,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return result;
}
