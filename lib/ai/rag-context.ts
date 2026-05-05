/**
 * lib/ai/rag-context.ts
 *
 * Retrieval-Augmented Generation — собирает релевантные маршруты и туры
 * из БД и инжектирует их в системный промпт AI перед каждым ответом.
 *
 * Использует:
 *   1. Full-text search на agent_route_knowledge (маршруты, места)
 *   2. findRelevantTours() — активные туры с ценами и операторами
 *
 * Без ML-модели: быстро (<50ms), надёжно в продакшне.
 */

import { pool } from '@/lib/db-pool';
import { detectTourIntent, findRelevantTours } from './booking-intent';
import { semanticSearch } from './embeddings';
import { distanceKm, regionName, type UserLocation } from '@/lib/geo/kamchatka';

// ── In-memory TTL cache (5 min, max 200 entries) ────────────────
const RAG_CACHE = new Map<string, { data: string; ts: number }>();
const RAG_TTL = 5 * 60 * 1000;

function getCacheKey(message: string): string {
  return message.toLowerCase().replace(/[^а-яёa-z\s]/gi, '').trim();
}

function evictStale(): void {
  if (RAG_CACHE.size <= 200) return;
  const now = Date.now();
  for (const [k, v] of RAG_CACHE) {
    if (now - v.ts > RAG_TTL) RAG_CACHE.delete(k);
  }
}

// ── Reciprocal Rank Fusion (RRF) — hybrid reranking ───────────
// Combines fulltext and semantic results into a single ranked list.
// RRF score = sum(1 / (k + rank_i)) for each result list.
// k=60 is standard constant from the original RRF paper.

interface RankedRoute {
  title: string;
  description: string | null;
  category: string;
  lat?: number | null;
  lng?: number | null;
}

function reciprocalRankFusion(
  fulltextResults: RankedRoute[],
  semanticResults: RankedRoute[],
  k = 60,
  limit = 5,
  userLocation?: UserLocation,
): RankedRoute[] {
  const scores = new Map<string, { score: number; route: RankedRoute }>();

  for (let i = 0; i < fulltextResults.length; i++) {
    const key = fulltextResults[i].title;
    const prev = scores.get(key);
    const rrf = 1 / (k + i + 1);
    scores.set(key, {
      score: (prev?.score ?? 0) + rrf,
      route: fulltextResults[i],
    });
  }

  for (let i = 0; i < semanticResults.length; i++) {
    const key = semanticResults[i].title;
    const prev = scores.get(key);
    const rrf = 1 / (k + i + 1);
    scores.set(key, {
      score: (prev?.score ?? 0) + rrf,
      route: prev?.route ?? semanticResults[i],
    });
  }

  // ── Geo boost: proximity scoring ──
  if (userLocation) {
    for (const entry of scores.values()) {
      const r = entry.route;
      if (r.lat != null && r.lng != null) {
        const d = distanceKm(
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: r.lat, lng: r.lng },
        );
        if (d < 10) entry.score *= 1.5;       // +50% для очень близких (<10 км)
        else if (d < 50) entry.score *= 1.2;   // +20% для близких (<50 км)
      }
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.route);
}

// ── Полнотекстовый поиск маршрутов (russian tsvector) ─────────────

async function findRoutesByText(
  message: string,
  limit = 5,
): Promise<{ title: string; description: string | null; category: string }[]> {
  const words = message
    .toLowerCase()
    .replace(/[^а-яёa-z\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6)
    .join(' ');

  if (!words) return [];

  try {
    const result = await pool.query<{
      title: string;
      description: string | null;
      category: string;
      lat: number | null;
      lng: number | null;
    }>(
      `SELECT title, LEFT(description, 100) AS description, category, lat, lng
       FROM agent_route_knowledge
       WHERE to_tsvector('russian', coalesce(title,'') || ' ' || coalesce(description,''))
         @@ plainto_tsquery('russian', $1)
       LIMIT $2`,
      [words, limit],
    );
    return result.rows;
  } catch {
    return [];
  }
}

// ── Ближайшие 3 места к пользователю (для инжекта в промпт) ────────
/**
 * Возвращает топ-3 ближайших места из agent_route_knowledge к координатам юзера.
 * Использует SQL-сортировку по Haversine расстоянию.
 */
async function findNearbyPlaces(
  userLocation: UserLocation,
  limit = 3,
): Promise<{
  title: string;
  category: string;
  distance: number;
  direction: string;
  description: string | null;
}[]> {
  const { lat, lng } = userLocation;
  try {
    const result = await pool.query<{
      title: string;
      category: string;
      lat: number | null;
      lng: number | null;
      description: string | null;
    }>(
      `SELECT title, category, lat, lng, LEFT(description, 150) AS description
       FROM agent_route_knowledge
       WHERE lat IS NOT NULL AND lng IS NOT NULL
         AND lat BETWEEN $1 - 2.0 AND $1 + 2.0
         AND lng BETWEEN $2 - 2.0 AND $2 + 2.0
       LIMIT 200`,
      [lat, lng],
    );

    const withDist = result.rows
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => ({
        title: r.title,
        category: r.category,
        description: r.description,
        distance: distanceKm({ lat, lng }, { lat: r.lat!, lng: r.lng! }),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    // Добавляем направление (упрощённо: 8 румбов)
    const dirs = ['север', 'северо-восток', 'восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад'];
    return withDist.map((p) => {
      const fullResult = result.rows.find((r) => r.title === p.title);
      let direction = '';
      if (fullResult?.lat != null && fullResult?.lng != null) {
        const dLat = fullResult.lat - lat;
        const dLng = fullResult.lng - lng;
        const angle = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
        direction = dirs[Math.round(angle / 45) % 8];
      }
      return { ...p, direction };
    });
  } catch {
    return [];
  }
}

// ── Гео-контекст для инжекта в системный промпт ────────
export async function buildGeoContext(
  userLocation: UserLocation,
): Promise<string> {
  const { lat, lng, accuracy } = userLocation;
  const region = regionName(lat, lng);
  const nearby = await findNearbyPlaces(userLocation, 3);

  if (nearby.length === 0) {
    return `\n\nТВОЁ МЕСТОПОЛОЖЕНИЕ:\n- Координаты: ${lat.toFixed(4)}, ${lng.toFixed(4)} (точность ±${Math.round(accuracy ?? 0)}м)\n- Регион: ${region}`;
  }

  let geo = `\n\nТВОЁ МЕСТОПОЛОЖЕНИЕ:\n- Координаты: ${lat.toFixed(4)}, ${lng.toFixed(4)} (точность ±${Math.round(accuracy ?? 0)}м)\n- Регион: ${region}\n- Ближайшие ${nearby.length} мест из базы:\n`;
  nearby.forEach((p, i) => {
    const distStr = p.distance < 1 ? `${Math.round(p.distance * 1000)} м` : `${p.distance.toFixed(1)} км`;
    geo += `  ${i + 1}. ${p.title} [${p.category}] — ${distStr} ${p.direction}\n`;
  });
  geo += `\nУчитывай это в советах. Если спрашивает про ближайшие места — называй конкретные расстояния и направления.\nНе давай советы про места которые в 200+ км если есть ближе. Если нужно ехать далеко — упомяни сколько и как добираться.`;
  return geo;
}

// ── Главная функция: строит RAG-блок для инжекта в промпт ────────
export type RAGResult = { routes: RankedRoute[]; tours: Awaited<ReturnType<typeof findRelevantTours>> };

export async function buildRAGContext(
  message: string,
  role: string,
  userLocation?: UserLocation,
): Promise<string> {
  // RAG для туристов и агентов — нужны конкретные туры и маршруты
  if (role !== 'tourist' && role !== 'agent') return '';

  // Check cache (cache key includes geo awareness)
  const cacheKey = getCacheKey(message) + (userLocation ? `|${userLocation.lat.toFixed(1)},${userLocation.lng.toFixed(1)}` : '');
  const cached = RAG_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < RAG_TTL) return cached.data;

  const intent = detectTourIntent(message);

  // Hybrid retrieval: fulltext + semantic + RRF fusion
  const [fulltextRoutes, semanticResults, tours] = await Promise.all([
    findRoutesByText(message, 8),
    semanticSearch(message, 8).catch(() => []),
    intent.detected
      ? findRelevantTours(intent.activityType, intent.rawWords, 3)
      : Promise.resolve([]),
  ]);

  const semanticRoutes = semanticResults.map((r) => ({
    title: r.title,
    description: r.description,
    category: r.category,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
  }));

  const routes = reciprocalRankFusion(fulltextRoutes, semanticRoutes, 60, 5, userLocation);

  if (routes.length === 0 && tours.length === 0) return '';

  let ctx = '\n\n--- КОНТЕКСТ ПЛАТФОРМЫ (используй в ответе) ---';

  if (routes.length > 0) {
    ctx += '\n\nМАРШРУТЫ И МЕСТА НА TOURHAB:';
    if (userLocation) {
      ctx += ' (отсортированы по близости к тебе)';
    }
    ctx += '\n';
    ctx += routes
      .map((r) => {
        let line = `• ${r.title} [${r.category}]${r.description ? ' — ' + r.description : ''}`;
        if (userLocation && r.lat != null && r.lng != null) {
          const d = distanceKm(
            { lat: userLocation.lat, lng: userLocation.lng },
            { lat: r.lat, lng: r.lng },
          );
          const distStr = d < 1 ? `${Math.round(d * 1000)} м` : `${d.toFixed(1)} км`;
          line += ` (${distStr} от тебя)`;
        }
        return line;
      })
      .join('\n');
  }

  if (tours.length > 0) {
    ctx += '\n\nДОСТУПНЫЕ ТУРЫ ДЛЯ БРОНИРОВАНИЯ:\n';
    ctx += tours
      .map(
        (t) =>
          `• "${t.title}" | Оператор: ${t.operator_name} | от ${t.base_price.toLocaleString('ru-RU')} ₽ | tourhab.ru/marketplace/tours/${t.id}`,
      )
      .join('\n');
    ctx +=
      '\nЕсли турист интересуется — называй конкретный тур и ссылку на него.';
  }

  ctx += '\n--- КОНЕЦ КОНТЕКСТА ---';

  // Increment search_count for matched routes (fire-and-forget)
  if (routes.length > 0) {
    void incrementSearchCounts(routes.map((r) => r.title));
  }

  // Store in cache
  RAG_CACHE.set(cacheKey, { data: ctx, ts: Date.now() });
  evictStale();

  return ctx;
}

// ── Increment search_count in DB (non-blocking) ─────────────
async function incrementSearchCounts(titles: string[]): Promise<void> {
  if (titles.length === 0) return;
  try {
    await pool.query(
      `UPDATE agent_route_knowledge
       SET search_count = search_count + 1
       WHERE title = ANY($1)`,
      [titles],
    );
  } catch {
    // Non-critical — don't block RAG response
  }
}
