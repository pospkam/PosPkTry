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
    }>(
      `SELECT title, LEFT(description, 100) AS description, category
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

// ── Главная функция: строит RAG-блок для инжекта в промпт ────────

export async function buildRAGContext(
  message: string,
  role: string,
): Promise<string> {
  // RAG для туристов и агентов — нужны конкретные туры и маршруты
  if (role !== 'tourist' && role !== 'agent') return '';

  // Check cache
  const cacheKey = getCacheKey(message);
  const cached = RAG_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < RAG_TTL) return cached.data;

  const intent = detectTourIntent(message);

  const [routes, tours] = await Promise.all([
    findRoutesByText(message, 5),
    intent.detected
      ? findRelevantTours(intent.activityType, intent.rawWords, 3)
      : Promise.resolve([]),
  ]);

  if (routes.length === 0 && tours.length === 0) return '';

  let ctx = '\n\n--- КОНТЕКСТ ПЛАТФОРМЫ (используй в ответе) ---';

  if (routes.length > 0) {
    ctx += '\n\nМАРШРУТЫ И МЕСТА НА TOURHAB:\n';
    ctx += routes
      .map(
        (r) =>
          `• ${r.title} [${r.category}]${r.description ? ' — ' + r.description : ''}`,
      )
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

  // Store in cache
  RAG_CACHE.set(cacheKey, { data: ctx, ts: Date.now() });
  evictStale();

  return ctx;
}
