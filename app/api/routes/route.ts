/**
 * GET /api/routes
 * Публичный каталог маршрутов из agent_route_knowledge.
 * Поддерживает: поиск, фильтрацию по категории, пагинацию, geo-фильтр.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

function isImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/');
}

function pickPrimaryImage(payload: Record<string, unknown>): string | null {
  const arrayCandidates = [payload.photos, payload.images, payload.gallery];
  for (const candidate of arrayCandidates) {
    if (Array.isArray(candidate)) {
      const found = candidate.find(isImageUrl);
      if (found) return found.trim();
    }
  }

  const singleCandidates = [
    payload.image,
    payload.cover_image,
    payload.hero_image,
    payload.tour_image,
  ];
  for (const candidate of singleCandidates) {
    if (isImageUrl(candidate)) return candidate.trim();
  }

  return null;
}

/**
 * Красивые фото-плейсхолдеры по категориям.
 * Используются когда у оператора нет фото или оно бытового качества.
 * Фото лежат в public/images/partners/kamchatintour/
 */
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  vulkani:              '/images/partners/kamchatintour/volcanoes.webp',
  termalnye_istochniki: '/images/partners/kamchatintour/thermal.jpg',
  geyzery:              '/images/partners/kamchatintour/seo2.jpg',
  morskie_progulki:     '/images/partners/kamchatintour/sea-russkaya.jpg',
  rybalka:              '/images/partners/kamchatintour/rafting.jpg',
  snegohod:             '/images/partners/kamchatintour/snowmobile.jpg',
  vertoletnye_tury:     '/images/partners/kamchatintour/helicopter.jpg',
  dzhip:                '/images/partners/kamchatintour/intro.jpg',
  medvedi:              '/images/partners/kamchatintour/cape.jpg',
  splav:                '/images/partners/kamchatintour/rafting.jpg',
  eco:                  '/images/partners/kamchatintour/seo1.jpg',
  trekking:             '/images/partners/kamchatintour/gorely.jpg',
  lakes:                '/images/partners/kamchatintour/seo4.jpg',
  rivers:               '/images/partners/kamchatintour/rafting.jpg',
  mountains:            '/images/partners/kamchatintour/volcanoes.webp',
};

/**
 * Получить фоллбэк-фото по категории.
 * Если категории нет в маппинге — пробуем подобрать по ключевым словам.
 */
function getCategoryFallbackImage(category: string | null): string | null {
  if (!category) return null;
  if (CATEGORY_FALLBACK_IMAGES[category]) return CATEGORY_FALLBACK_IMAGES[category];

  // Подбор по ключевым словам в категории/активности/типе локации (не строгий)
  const lower = category.toLowerCase();
  if (lower.includes('вулкан') || lower.includes('volcan')) return CATEGORY_FALLBACK_IMAGES.vulkani;
  if (lower.includes('терм') || lower.includes('thermal') || lower.includes('источник')) return CATEGORY_FALLBACK_IMAGES.termalnye_istochniki;
  if (lower.includes('мор') || lower.includes('sea') || lower.includes('boat')) return CATEGORY_FALLBACK_IMAGES.morskie_progulki;
  if (lower.includes('рыбалк') || lower.includes('fish')) return CATEGORY_FALLBACK_IMAGES.rybalka;
  if (lower.includes('снег') || lower.includes('snow')) return CATEGORY_FALLBACK_IMAGES.snegohod;
  if (lower.includes('вертолёт') || lower.includes('вертол') || lower.includes('helicopter') || lower.includes('heli')) return CATEGORY_FALLBACK_IMAGES.vertoletnye_tury;
  if (lower.includes('медвед') || lower.includes('bear')) return CATEGORY_FALLBACK_IMAGES.medvedi;
  if (lower.includes('сплав') || lower.includes('raft')) return CATEGORY_FALLBACK_IMAGES.splav;
  if (lower.includes('гейзер') || lower.includes('geyser')) return CATEGORY_FALLBACK_IMAGES.geyzery;
  if (lower.includes('озер') || lower.includes('lake')) return CATEGORY_FALLBACK_IMAGES.lakes;
  if (lower.includes('река') || lower.includes('river')) return CATEGORY_FALLBACK_IMAGES.rivers;
  if (lower.includes('гор') || lower.includes('mountain')) return CATEGORY_FALLBACK_IMAGES.mountains;

  return null;
}

const QuerySchema = z.object({
  q:             z.string().max(200).optional(),
  kind:          z.enum(['place', 'route', 'tour']).optional(),
  category:      z.string().max(60).optional(),
  location_type: z.string().max(60).optional(),
  activity_type: z.string().max(60).optional(),
  page:          z.coerce.number().int().min(1).default(1),
  limit:         z.coerce.number().int().min(1).max(2000).default(24),
  hasCoords:     z.enum(['true', 'false']).optional(),
  sort:          z.enum(['title', 'recent', 'price_asc', 'price_desc', 'recommended']).default('title'),
  difficulty:    z.enum(['easy', 'medium', 'hard']).optional(),
  price_min:     z.coerce.number().min(0).optional(),
  price_max:     z.coerce.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Неверные параметры запроса' }, { status: 400 });
  }

  const { q, kind, category, location_type, activity_type, page, limit, hasCoords, sort, difficulty, price_min, price_max } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['is_visible = TRUE'];
  const params: unknown[] = [];
  let idx = 1;

  if (q) {
    conditions.push(`(ark.title ILIKE $${idx} OR ark.description ILIKE $${idx + 1})`);
    params.push(`%${q}%`, `%${q}%`);
    idx += 2;
  }
  if (kind) {
    conditions.push(`kind = $${idx}`);
    params.push(kind);
    idx++;
  }
  if (category) {
    conditions.push(`category = $${idx}`);
    params.push(category);
    idx++;
  }
  if (location_type) {
    conditions.push(`location_type = $${idx}`);
    params.push(location_type);
    idx++;
  }
  if (activity_type) {
    conditions.push(`activity_type = $${idx}`);
    params.push(activity_type);
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
           ark.id,
           ark.route_dedupe_key,
           ark.kind,
           ark.category,
           ark.location_type,
           ark.activity_type,
           ark.title,
           ark.description,
           ark.lat,
           ark.lng,
           ark.source_url,
           ark.source_name,
           ark.payload,
           ark.payload->'price_from'      AS price_from,
           ark.payload->'season'          AS season,
           ark.payload->'difficulty'      AS difficulty,
           ark.payload->'duration_days'   AS duration_days,
           ark.payload->'best_months'     AS best_months,
           ark.payload->'geometry'        AS geometry,
           ark.payload->>'volcano_status' AS volcano_status,
           ark.created_at,
           (ari.route_id IS NOT NULL) AS has_ai_image
         FROM agent_route_knowledge ark
         LEFT JOIN ai_route_images ari ON ari.route_id = ark.id
         ${where}
         ORDER BY ${orderBy}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*)::int AS total FROM agent_route_knowledge ark ${where}`,
        params
      ),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return NextResponse.json({
      success: true,
      data: dataResult.rows.map(r => {
        const payload = (r.payload as Record<string, unknown>) ?? {};
        const imageUrl = pickPrimaryImage(payload) || getCategoryFallbackImage(r.category as string);

        return {
          ...(imageUrl ? { imageUrl } : {}),
          id:           r.id as string,
          slug:         r.route_dedupe_key as string,
          kind:         (r.kind as string) ?? 'place',
          category:     r.category as string,
          locationType: (r.location_type as string | null) ?? null,
          activityType: (r.activity_type as string | null) ?? null,
          title:        r.title as string,
          description:  (r.description as string | null) ?? '',
          lat:          r.lat != null ? parseFloat(r.lat as string) : null,
          lng:          r.lng != null ? parseFloat(r.lng as string) : null,
          sourceUrl:    (r.source_url as string | null) ?? null,
          sourceName:   (r.source_name as string | null) ?? null,
          priceFrom:    r.price_from != null ? Number(r.price_from) : null,
          season:       (r.season as string | null) ?? null,
          difficulty:   (r.difficulty as string | null) ?? null,
          durationDays: r.duration_days != null ? Number(r.duration_days) : null,
          bestMonths:   (r.best_months as number[] | null) ?? null,
          geometry:      (r.geometry as { type: string; coordinates: [number, number][]; color?: string; weight?: number } | null) ?? null,
          volcanoStatus: (r.volcano_status as string | null) ?? null,
          hasAiImage:   Boolean(r.has_ai_image),
        };
      }),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: true,
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
        degraded: true,
      },
      { status: 200 }
    );
  }
}
