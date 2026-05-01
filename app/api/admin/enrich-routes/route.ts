/**
 * GET  /api/admin/enrich-routes — статистика
 * POST /api/admin/enrich-routes — пакетное обогащение
 *   body: { mode?: 'description' | 'payload'; batch?: number; force?: boolean; dryRun?: boolean }
 *
 * mode=description — генерирует текстовые описания для маршрутов без/с короткими описаниями
 * mode=payload    — генерирует price_from, duration_days, season, difficulty и т.д.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ── Labels ────────────────────────────────────────────────────────────────────

const LOCATION_LABELS: Record<string, string> = {
  volcano:    'вулкан',
  geyser:     'гейзерное поле',
  hot_spring: 'горячий источник',
  thermal:    'термальный источник',
  lake:       'озеро',
  mountain:   'горный массив',
  river:      'река',
  bay:        'бухта',
  beach:      'пляж',
  forest:     'природный парк',
  museum:     'музей',
  historical: 'историческое место',
  rock:       'скала',
  viewpoint:  'смотровая площадка',
  settlement: 'населённый пункт',
};

const CATEGORY_LABELS: Record<string, string> = {
  vulkani:              'вулкан',
  termalnye_istochniki: 'термальный источник',
  morskie_progulki:     'морская прогулка',
  mountains:            'горный массив',
  eco:                  'природный объект',
  rybalka:              'рыбалка',
  snegohod:             'снегоходный маршрут',
  vertoletnye_tury:     'вертолётный тур',
  dzhip:                'джип-маршрут',
  trekking:             'треккинг',
  geyzery:              'гейзерное поле',
  rivers:               'река',
  lakes:                'озеро',
  medvedi:              'наблюдение за медведями',
  historical:           'историческое место',
  monument:             'памятник',
  nature_reserve:       'заповедник',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location_type: string | null;
  activity_type: string | null;
  lat: number | null;
  lng: number | null;
  payload: Record<string, unknown>;
}

interface PayloadEnrichment {
  price_from: number | null;
  duration_days: number | null;
  season: string | null;
  difficulty: string | null;
  best_months: number[] | null;
  how_to_get: string | null;
  what_to_bring: string[] | null;
}

// ── GET: stats ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError instanceof NextResponse) return authError;

  const { rows } = await pool.query<{
    total: string; no_desc: string; short_desc: string; needs_desc: string; good_desc: string;
    needs_payload: string;
  }>(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN description IS NULL OR description = '' THEN 1 END) as no_desc,
      COUNT(CASE WHEN description IS NOT NULL AND description != '' AND LENGTH(description) < 300 THEN 1 END) as short_desc,
      COUNT(CASE WHEN LENGTH(COALESCE(description,'')) < 300 THEN 1 END) as needs_desc,
      COUNT(CASE WHEN LENGTH(description) >= 300 THEN 1 END) as good_desc,
      COUNT(CASE WHEN payload->>'price_from' IS NULL AND payload->>'duration_days' IS NULL THEN 1 END) as needs_payload
    FROM agent_route_knowledge
    WHERE is_visible = true AND LENGTH(title) >= 4
  `);

  return NextResponse.json({ success: true, stats: rows[0] });
}

// ── POST: enrich ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Accept x-admin-key for cron compatibility FIRST (before user auth),
  // so internal cron callers aren't rejected by requireAdmin.
  const headerKey = req.headers.get('x-admin-key');
  const adminKey = process.env.ADMIN_API_KEY ?? process.env.CRON_SECRET;
  const hasValidCronKey = !!(adminKey && headerKey && headerKey === adminKey);

  if (!hasValidCronKey) {
    const authError = await requireAdmin(req);
    if (authError instanceof NextResponse) return authError;
  }

  const body = await req.json().catch(() => ({})) as {
    mode?: 'description' | 'payload';
    batch?: number;
    force?: boolean;
    dryRun?: boolean;
  };

  const mode = body.mode ?? 'description';
  const batchSize = Math.min(body.batch ?? 20, 50);
  const force = body.force ?? false;
  const dryRun = body.dryRun ?? false;

  if (mode === 'description') {
    return enrichDescriptions(batchSize, force, dryRun);
  }
  return enrichPayload(batchSize, dryRun);
}

// ── Mode: description ─────────────────────────────────────────────────────────

async function enrichDescriptions(batchSize: number, force: boolean, dryRun: boolean) {
  const condition = force
    ? `(description IS NULL OR LENGTH(description) < 300)`
    : `(description IS NULL OR description = '' OR LENGTH(description) < 300)`;

  const { rows } = await pool.query<RouteRow>(`
    SELECT id, title, description, category, location_type, activity_type, lat, lng,
           COALESCE(payload, '{}'::jsonb) as payload
    FROM agent_route_knowledge
    WHERE is_visible = true AND LENGTH(title) >= 4 AND ${condition}
    ORDER BY CASE WHEN description IS NULL THEN 0 ELSE 1 END, title
    LIMIT $1
  `, [batchSize]);

  if (rows.length === 0) {
    return NextResponse.json({ success: true, processed: 0, improved: 0, message: 'Все описания заполнены' });
  }

  let improved = 0;
  let errors = 0;
  const results: Array<{ id: string; title: string; ok: boolean; len?: number; error?: string }> = [];

  for (const route of rows) {
    try {
      const description = await generateDescription(route);
      if (!description) {
        results.push({ id: route.id, title: route.title, ok: false, error: 'AI empty response' });
        errors++;
        continue;
      }
      if (!dryRun) {
        await pool.query(
          `UPDATE agent_route_knowledge
           SET description = $1,
               payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
               updated_at = NOW()
           WHERE id = $3`,
          [description, JSON.stringify({ enriched_at: new Date().toISOString(), enriched_by: 'admin_api' }), route.id],
        );
      }
      improved++;
      results.push({ id: route.id, title: route.title, ok: true, len: description.length });
    } catch (e) {
      errors++;
      results.push({ id: route.id, title: route.title, ok: false, error: String(e) });
    }
  }

  const { rows: rem } = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM agent_route_knowledge
     WHERE is_visible = true AND LENGTH(title) >= 4
       AND (description IS NULL OR description = '' OR LENGTH(description) < 300)`,
  );

  return NextResponse.json({
    success: true, mode: 'description', dryRun,
    processed: rows.length, improved, errors,
    remaining: Number(rem[0]?.cnt ?? 0),
    results,
  });
}

async function generateDescription(route: RouteRow): Promise<string | null> {
  const typeLabel = (route.location_type && LOCATION_LABELS[route.location_type])
    ?? (route.category && CATEGORY_LABELS[route.category])
    ?? 'природный объект';

  const coordsHint = route.lat != null && route.lng != null
    ? ` (${route.lat.toFixed(3)}°N, ${route.lng.toFixed(3)}°E)` : '';

  const existing = route.description?.trim() ?? '';

  const text = await callAIFast([{
    role: 'user',
    content: `Напиши описание туристического объекта Камчатки на русском языке.

Название: ${route.title}
Тип: ${typeLabel}${coordsHint}
${existing ? `Дополни имеющееся: ${existing}` : ''}

Требования:
- 300–500 символов, сплошной текст без заголовков и списков
- Включи координаты если есть, высоту/температуру/площадь
- Укажи как добраться и лучший сезон
- Стиль: информативно, без пафоса`,
  }] as ChatMessage[]);

  const result = text?.trim();
  return result && result.length >= 100 ? result : null;
}

// ── Mode: payload ─────────────────────────────────────────────────────────────

async function enrichPayload(batchSize: number, dryRun: boolean) {
  const { rows } = await pool.query<RouteRow>(`
    SELECT id, title, description, location_type, activity_type,
           lat, lng, category, COALESCE(payload, '{}'::jsonb) as payload
    FROM agent_route_knowledge
    WHERE is_visible = true AND LENGTH(title) >= 4
      AND (payload->>'price_from' IS NULL AND payload->>'duration_days' IS NULL AND payload->>'season' IS NULL)
    ORDER BY location_type, title
    LIMIT $1
  `, [batchSize]);

  const results: Array<{ id: string; title: string; status: string; data?: PayloadEnrichment }> = [];

  for (const route of rows) {
    try {
      const messages = buildPayloadPrompt(route);
      const text = await callAIFast(messages);
      const data = parsePayloadResponse(text);

      if (!data) {
        results.push({ id: route.id, title: route.title, status: 'parse_error' });
        continue;
      }
      if (!dryRun) {
        const merged = { ...route.payload };
        if (data.price_from != null)    merged.price_from    = data.price_from;
        if (data.duration_days != null) merged.duration_days = data.duration_days;
        if (data.season != null)        merged.season        = data.season;
        if (data.difficulty != null)    merged.difficulty    = data.difficulty;
        if (data.best_months != null)   merged.best_months   = data.best_months;
        if (data.how_to_get != null)    merged.how_to_get    = data.how_to_get;
        if (data.what_to_bring != null) merged.what_to_bring = data.what_to_bring;

        await pool.query(
          `UPDATE agent_route_knowledge SET payload = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(merged), route.id],
        );
      }
      results.push({ id: route.id, title: route.title, status: dryRun ? 'dry_run' : 'enriched', data });
    } catch (err) {
      results.push({ id: route.id, title: route.title, status: `error: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  }

  const enriched = results.filter(r => r.status === 'enriched' || r.status === 'dry_run').length;

  return NextResponse.json({
    success: true, mode: 'payload', dryRun,
    processed: rows.length, enriched,
    failed: results.length - enriched,
    results,
  });
}

function buildPayloadPrompt(route: RouteRow): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are a Kamchatka tourism expert. Generate realistic tourist data for locations.
Respond ONLY with valid JSON, no markdown, no explanation. All prices in RUB. Text in Russian.

JSON schema:
{
  "price_from": number|null,
  "duration_days": number|null,
  "season": "summer"|"winter"|"year-round"|null,
  "difficulty": "easy"|"moderate"|"hard"|"extreme"|null,
  "best_months": [6,7,8,9]|null,
  "how_to_get": "string in Russian"|null,
  "what_to_bring": ["item1","item2"]|null
}

Price guidelines:
- Museums/cultural: 300-1500 RUB entry
- Volcano treks with guide: 15000-80000 RUB
- Helicopter tours: 40000-95000 RUB
- Hot springs entry: 500-3000 RUB; remote with transfer: 15000-40000 RUB
- Fishing tours: 25000-80000 RUB
- Beaches, viewpoints: null (free)`,
    },
    {
      role: 'user',
      content: `"${route.title}"
Type: ${route.location_type ?? 'unknown'}, Activity: ${route.activity_type ?? 'unknown'}
Coords: ${route.lat != null ? `${route.lat}, ${route.lng}` : 'unknown'}
Desc: ${(route.description ?? '').replace(/<[^>]+>/g, '').slice(0, 300)}

Generate JSON:`,
    },
  ];
}

function parsePayloadResponse(text: string): PayloadEnrichment | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const data = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return {
      price_from:    typeof data.price_from    === 'number' ? data.price_from    : null,
      duration_days: typeof data.duration_days === 'number' ? data.duration_days : null,
      season:        typeof data.season        === 'string' ? data.season        : null,
      difficulty:    typeof data.difficulty    === 'string' ? data.difficulty    : null,
      best_months:   Array.isArray(data.best_months)
        ? (data.best_months as unknown[]).filter((m): m is number => typeof m === 'number') : null,
      how_to_get:    typeof data.how_to_get    === 'string' ? data.how_to_get    : null,
      what_to_bring: Array.isArray(data.what_to_bring)
        ? (data.what_to_bring as unknown[]).filter((s): s is string => typeof s === 'string') : null,
    };
  } catch {
    return null;
  }
}
