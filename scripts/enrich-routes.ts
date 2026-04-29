/**
 * scripts/enrich-routes.ts
 *
 * Обогащение маршрутов-призраков данными через AI.
 * 80 из 131 маршрутов не имеют: цены, длительности, сезона, сложности.
 *
 * Запуск: npx tsx scripts/enrich-routes.ts [--dry-run] [--limit=10]
 *
 * Источники данных:
 * 1. AI (callAIFast) — генерация price_from, duration_days, season, difficulty, best_months
 * 2. Wikidata/Wikipedia — будущее расширение для описаний
 */

import { pool } from '../lib/db-pool';
import { callAIFast } from '../lib/ai/providers';
import type { ChatMessage } from '../lib/ai/prompts';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : 80;
const DELAY_MS = 2000; // пауза между запросами чтобы не убить rate limit

interface GhostRoute {
  id: string;
  title: string;
  description: string;
  location_type: string | null;
  activity_type: string | null;
  lat: number | null;
  lng: number | null;
  category: string;
  payload: Record<string, unknown>;
}

interface EnrichmentData {
  price_from: number | null;
  duration_days: number | null;
  season: string | null;
  difficulty: string | null;
  best_months: number[] | null;
  how_to_get: string | null;
  what_to_bring: string[] | null;
}

async function fetchGhosts(): Promise<GhostRoute[]> {
  const { rows } = await pool.query(`
    SELECT id, title, description, location_type, activity_type,
           lat, lng, category, COALESCE(payload, '{}'::jsonb) as payload
    FROM agent_route_knowledge
    WHERE is_visible = TRUE
      AND (
        payload->>'price_from' IS NULL
        AND payload->>'duration_days' IS NULL
        AND payload->>'season' IS NULL
      )
    ORDER BY location_type, title
    LIMIT $1
  `, [LIMIT]);

  return rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) ?? '',
    location_type: r.location_type as string | null,
    activity_type: r.activity_type as string | null,
    lat: r.lat != null ? parseFloat(r.lat as string) : null,
    lng: r.lng != null ? parseFloat(r.lng as string) : null,
    category: r.category as string,
    payload: (r.payload as Record<string, unknown>) ?? {},
  }));
}

function buildPrompt(route: GhostRoute): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are a Kamchatka tourism expert. You generate realistic tourist data for locations.
Respond ONLY with valid JSON, no markdown, no explanation.
All prices in RUB. All text in Russian.

JSON schema:
{
  "price_from": number|null,       // min price for visiting (tour/entrance/transport). null if free
  "duration_days": number|null,    // typical visit duration in days (0.5 = half day)
  "season": string|null,           // "summer"|"winter"|"year-round"
  "difficulty": string|null,       // "easy"|"moderate"|"hard"|"extreme"
  "best_months": number[]|null,    // [6,7,8,9] = June-Sept
  "how_to_get": string|null,       // 1-2 sentences in Russian, how to get there from Petropavlovsk
  "what_to_bring": string[]|null   // 3-5 items to bring
}

Rules:
- price_from for museums/cultural: 300-1500 RUB entry
- price_from for volcano treks: 15000-80000 RUB (includes guide, transport)
- price_from for helicopter tours: 40000-95000 RUB
- price_from for hot springs: 500-3000 RUB (entry) or 15000-40000 for remote ones (with transfer)
- price_from for fishing: 25000-80000 RUB
- duration_days: museum = 0.5, day hike = 1, multi-day trek = 3-7
- Free locations (beaches, viewpoints): price_from = null
- If you are not sure about price, estimate conservatively`,
    },
    {
      role: 'user',
      content: `Location: "${route.title}"
Type: ${route.location_type ?? 'unknown'}
Activity: ${route.activity_type ?? 'unknown'}
Category: ${route.category}
Coordinates: ${route.lat != null ? `${route.lat}, ${route.lng}` : 'unknown'}
Description (first 300 chars): ${route.description.replace(/<[^>]+>/g, '').slice(0, 300)}

Generate tourist data JSON:`,
    },
  ];
}

function parseAIResponse(text: string): EnrichmentData | null {
  try {
    // Extract JSON from response (may have markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      price_from: typeof data.price_from === 'number' ? data.price_from : null,
      duration_days: typeof data.duration_days === 'number' ? data.duration_days : null,
      season: typeof data.season === 'string' ? data.season : null,
      difficulty: typeof data.difficulty === 'string' ? data.difficulty : null,
      best_months: Array.isArray(data.best_months) ? data.best_months.filter((m): m is number => typeof m === 'number') : null,
      how_to_get: typeof data.how_to_get === 'string' ? data.how_to_get : null,
      what_to_bring: Array.isArray(data.what_to_bring) ? data.what_to_bring.filter((s): s is string => typeof s === 'string') : null,
    };
  } catch {
    return null;
  }
}

async function enrichRoute(route: GhostRoute): Promise<{ success: boolean; data?: EnrichmentData }> {
  const messages = buildPrompt(route);

  try {
    const text = await callAIFast(messages);
    const data = parseAIResponse(text);

    if (!data) {
      process.stderr.write(`  PARSE FAIL: ${route.title}\n`);
      return { success: false };
    }

    if (DRY_RUN) {
      process.stdout.write(`  [DRY] ${route.title}: ${JSON.stringify(data)}\n`);
      return { success: true, data };
    }

    // Merge with existing payload
    const merged = { ...route.payload };
    if (data.price_from != null) merged.price_from = data.price_from;
    if (data.duration_days != null) merged.duration_days = data.duration_days;
    if (data.season != null) merged.season = data.season;
    if (data.difficulty != null) merged.difficulty = data.difficulty;
    if (data.best_months != null) merged.best_months = data.best_months;
    if (data.how_to_get != null) merged.how_to_get = data.how_to_get;
    if (data.what_to_bring != null) merged.what_to_bring = data.what_to_bring;

    await pool.query(
      `UPDATE agent_route_knowledge SET payload = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(merged), route.id]
    );

    return { success: true, data };
  } catch (err) {
    process.stderr.write(`  AI ERROR: ${route.title}: ${err instanceof Error ? err.message : 'unknown'}\n`);
    return { success: false };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  process.stdout.write(`\n=== Route Enrichment ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'} ===\n`);
  process.stdout.write(`Limit: ${LIMIT}\n\n`);

  const ghosts = await fetchGhosts();
  process.stdout.write(`Found ${ghosts.length} ghost routes to enrich\n\n`);

  if (ghosts.length === 0) {
    process.stdout.write('Nothing to do.\n');
    process.exit(0);
  }

  let success = 0;
  let fail = 0;

  for (let i = 0; i < ghosts.length; i++) {
    const route = ghosts[i];
    process.stdout.write(`[${i + 1}/${ghosts.length}] ${route.title} (${route.location_type})...\n`);

    const result = await enrichRoute(route);
    if (result.success) {
      success++;
      if (result.data) {
        const price = result.data.price_from != null ? `${result.data.price_from} RUB` : 'free';
        const dur = result.data.duration_days != null ? `${result.data.duration_days}d` : '?';
        process.stdout.write(`  OK: ${price}, ${dur}, ${result.data.season ?? '?'}, ${result.data.difficulty ?? '?'}\n`);
      }
    } else {
      fail++;
    }

    // Rate limit pause (skip on last)
    if (i < ghosts.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  process.stdout.write(`\n=== Done: ${success} enriched, ${fail} failed ===\n`);
  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
