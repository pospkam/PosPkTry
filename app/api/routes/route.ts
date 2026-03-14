/**
 * GET /api/routes
 * Публичный каталог маршрутов из agent_route_knowledge.
 * Поддерживает: поиск, фильтрацию по категории, пагинацию, geo-фильтр.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  q:          z.string().max(200).optional(),
  category:   z.string().max(60).optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(24),
  hasCoords:  z.enum(['true', 'false']).optional(),
  sort:       z.enum(['title', 'recent', 'price_asc', 'price_desc', 'recommended']).default('title'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  price_min:  z.coerce.number().min(0).optional(),
  price_max:  z.coerce.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Неверные параметры запроса' }, { status: 400 });
  }

  const { q, category, page, limit, hasCoords, sort, difficulty, price_min, price_max } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (q) {
    conditions.push(`search_text ILIKE $${idx}`);
    params.push(`%${q}%`);
    idx++;
  }
  if (category) {
    conditions.push(`category = $${idx}`);
    params.push(category);
    idx++;
  }
  if (hasCoords === 'true') {
    conditions.push(`lat IS NOT NULL AND lng IS NOT NULL`);
  }
  if (difficulty) {
    conditions.push(`payload->>'difficulty' = $${idx}`);
    params.push(difficulty);
    idx++;
  }
  if (price_min != null) {
    conditions.push(`(payload->>'price_from')::numeric >= $${idx}`);
    params.push(price_min);
    idx++;
  }
  if (price_max != null) {
    conditions.push(`(payload->>'price_from')::numeric <= $${idx}`);
    params.push(price_max);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const orderBy =
    sort === 'recent'      ? 'created_at DESC' :
    sort === 'price_asc'   ? 'COALESCE((payload->>\'price_from\')::numeric, 999999999) ASC, title ASC' :
    sort === 'price_desc'  ? 'COALESCE((payload->>\'price_from\')::numeric, 0) DESC, title ASC' :
    sort === 'recommended' ? `(
      CASE WHEN payload->>'price_from'    IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN payload->>'difficulty'    IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN payload->>'duration_days' IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN payload->>'best_months'   IS NOT NULL THEN 1 ELSE 0 END
    ) DESC, title ASC` :
    'title ASC';

  try {
    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT
           id,
           route_dedupe_key,
           category,
           title,
           description,
           lat,
           lng,
           source_url,
           source_name,
           payload->'price_from'    AS price_from,
           payload->'season'        AS season,
           payload->'difficulty'    AS difficulty,
           payload->'duration_days' AS duration_days,
           payload->'best_months'   AS best_months,
           created_at
         FROM agent_route_knowledge
         ${where}
         ORDER BY ${orderBy}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*)::int AS total FROM agent_route_knowledge ${where}`,
        params
      ),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return NextResponse.json({
      success: true,
      data: dataResult.rows.map(r => ({
        id:          r.id as string,
        slug:        r.route_dedupe_key as string,
        category:    r.category as string,
        title:       r.title as string,
        description: (r.description as string | null) ?? '',
        lat:         r.lat != null ? parseFloat(r.lat as string) : null,
        lng:         r.lng != null ? parseFloat(r.lng as string) : null,
        sourceUrl:   (r.source_url as string | null) ?? null,
        sourceName:  (r.source_name as string | null) ?? null,
        priceFrom:   r.price_from != null ? Number(r.price_from) : null,
        season:      (r.season as string | null) ?? null,
        difficulty:  (r.difficulty as string | null) ?? null,
        durationDays: r.duration_days != null ? Number(r.duration_days) : null,
        bestMonths:  (r.best_months as number[] | null) ?? null,
      })),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки маршрутов', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}
