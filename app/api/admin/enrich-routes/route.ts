/**
 * POST /api/admin/enrich-routes
 *
 * Обогащение маршрутов-призраков через AI.
 * 80 из 131 маршрутов не имеют: цены, длительности, сезона.
 *
 * Body: { limit?: number, dryRun?: boolean }
 * Auth: admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';
import { z } from 'zod';

const RequestSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  dryRun: z.boolean().default(false),
});

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

interface EnrichmentResult {
  price_from: number | null;
  duration_days: number | null;
  season: string | null;
  difficulty: string | null;
  best_months: number[] | null;
  how_to_get: string | null;
  what_to_bring: string[] | null;
}

function buildPrompt(route: GhostRoute): ChatMessage[] {
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
- Beaches, viewpoints: null (free)

Duration: museum = 0.5, day hike = 1, multi-day trek = 3-7, expedition = 7-14`,
    },
    {
      role: 'user',
      content: `"${route.title}"
Type: ${route.location_type ?? 'unknown'}, Activity: ${route.activity_type ?? 'unknown'}
Coords: ${route.lat != null ? `${route.lat}, ${route.lng}` : 'unknown'}
Desc: ${route.description.replace(/<[^>]+>/g, '').slice(0, 300)}

Generate JSON:`,
    },
  ];
}

function parseResponse(text: string): EnrichmentResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const data = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      price_from: typeof data.price_from === 'number' ? data.price_from : null,
      duration_days: typeof data.duration_days === 'number' ? data.duration_days : null,
      season: typeof data.season === 'string' ? data.season : null,
      difficulty: typeof data.difficulty === 'string' ? data.difficulty : null,
      best_months: Array.isArray(data.best_months)
        ? data.best_months.filter((m): m is number => typeof m === 'number')
        : null,
      how_to_get: typeof data.how_to_get === 'string' ? data.how_to_get : null,
      what_to_bring: Array.isArray(data.what_to_bring)
        ? data.what_to_bring.filter((s): s is string => typeof s === 'string')
        : null,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Simple admin check via header (for cron/internal use)
  const authHeader = request.headers.get('x-admin-key');
  const adminKey = process.env.ADMIN_API_KEY || process.env.CRON_SECRET;
  if (!adminKey || authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { limit, dryRun } = parsed.data;

  // Fetch ghosts
  const { rows } = await pool.query(`
    SELECT id, title, description, location_type, activity_type,
           lat, lng, category, COALESCE(payload, '{}'::jsonb) as payload
    FROM agent_route_knowledge
    WHERE is_visible = TRUE
      AND (payload->>'price_from' IS NULL
           AND payload->>'duration_days' IS NULL
           AND payload->>'season' IS NULL)
    ORDER BY location_type, title
    LIMIT $1
  `, [limit]);

  const ghosts: GhostRoute[] = rows.map(r => ({
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

  const results: Array<{ id: string; title: string; status: string; data?: EnrichmentResult }> = [];

  for (const route of ghosts) {
    try {
      const messages = buildPrompt(route);
      const text = await callAIFast(messages);
      const data = parseResponse(text);

      if (!data) {
        results.push({ id: route.id, title: route.title, status: 'parse_error' });
        continue;
      }

      if (!dryRun) {
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
      }

      results.push({ id: route.id, title: route.title, status: dryRun ? 'dry_run' : 'enriched', data });
    } catch (err) {
      results.push({
        id: route.id,
        title: route.title,
        status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
      });
    }
  }

  const enriched = results.filter(r => r.status === 'enriched' || r.status === 'dry_run').length;
  const failed = results.filter(r => r.status !== 'enriched' && r.status !== 'dry_run').length;

  return NextResponse.json({
    total_ghosts: ghosts.length,
    enriched,
    failed,
    dryRun,
    results,
  });
}
