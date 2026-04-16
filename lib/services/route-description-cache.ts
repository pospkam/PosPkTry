/**
 * lib/services/route-description-cache.ts
 * 
 * Кеширование AI-генерируемых описаний маршрутов в PostgreSQL.
 * Улучшает SEO: одинаковые описания для поиска, контролируемые обновления.
 */

import { pool } from '@/lib/db-pool';
import { query } from '@/lib/database';
import { callAIFast } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface CachedDescription {
  routeId: string;
  description: string;
  generatedAt: Date;
  model: string;
}

/** Получить закешированное описание с fallback на оригинальное */
export async function getRouteDescription(
  routeId: string,
  originalDescription: string | null,
): Promise<string> {
  try {
    // Если исходное описание хорошее (>200 chars), используем его как основу
    if (originalDescription && originalDescription.length > 200) {
      return originalDescription;
    }

    // Пытаемся получить закешированное описание
    const { rows } = await query<{ description: string }>(
      `SELECT description FROM route_description_cache 
       WHERE route_id = $1 AND generated_at > NOW() - INTERVAL '90 days'
       LIMIT 1`,
      [routeId],
    );

    if (rows.length > 0) {
      return rows[0].description;
    }

    // Fallback
    return originalDescription || 'Туристический маршрут на Камчатке';
  } catch (error) {
    // Graceful fallback — return original description
    return originalDescription || 'Туристический маршрут на Камчатке';
  }
}

/** Генерировать и кешировать описание если его нет */
export async function generateAndCacheDescription(
  routeId: string,
  title: string,
  category: string,
  locationType: string | null,
  originalDesc: string | null,
  force = false,
): Promise<string> {
  try {
    // Проверяем кеш
    if (!force) {
      const cached = await getRouteDescription(routeId, originalDesc);
      if (cached !== (originalDesc || 'Туристический маршрут на Камчатке')) {
        return cached;
      }
    }

    // Генерируем новое описание через AI
    const prompt = buildDescriptionPrompt(title, category, locationType, originalDesc);
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt },
    ];
    const description = await callAIFast(messages);

    if (!description || description.length < 50) {
      return originalDesc || 'Туристический маршрут на Камчатке';
    }

    // Сохраняем в кеш (route_id — integer, routeId — строковое число)
    await pool.query(
      `INSERT INTO route_description_cache (route_id, description, model)
       VALUES ($1::integer, $2, 'ai-waterfall')
       ON CONFLICT (route_id) DO UPDATE
       SET description = EXCLUDED.description,
           generated_at = NOW()`,
      [routeId, description],
    );

    return description;
  } catch (error) {
    // Graceful fallback — return original description
    return originalDesc || 'Туристический маршрут на Камчатке';
  }
}

function buildDescriptionPrompt(
  title: string,
  category: string,
  locationType: string | null,
  originalDesc: string | null,
): string {
  const snippet = originalDesc
    ? originalDesc.replace(/<[^>]+>/g, '').slice(0, 200)
    : '';

  return `Ты туристический гайд Камчатки с опытом 20+ лет. Создай привлекательное 3-5 предложений SEO-оптимизированное описание маршрута для поисковых систем.

Название маршрута: "${title}"
Категория: "${category}"
Тип локации: ${locationType || 'неизвестен'}
${snippet ? `Исходное описание: ${snippet}` : ''}

Требования:
- Начни с ключевого слова (название + локация)
- Включи практическую информацию (что делать, как добраться, сложность)
- Неформальный, живой тон (не рекламный буклет)
- Для поиска: "Камчатка", "туристический маршрут", категория
- Точно 2-3 предложения, макс 200 символов

Описание:`;
}

/** Batch-обновить описания для operator_tours без кеша */
export async function refreshRoutesWithoutCache(limit = 50): Promise<number> {
  try {
    const { rows } = await pool.query<{
      id: number;
      title: string;
      category: string | null;
      location_type: string | null;
      description: string | null;
    }>(
      `SELECT t.id, t.title, t.activity_type AS category, t.location_type, t.description
       FROM operator_tours t
       LEFT JOIN route_description_cache rdc ON rdc.route_id = t.id
       WHERE t.is_published = TRUE
         AND (rdc.route_id IS NULL OR rdc.generated_at < NOW() - INTERVAL '90 days')
       ORDER BY t.created_at DESC
       LIMIT $1`,
      [limit],
    );

    let count = 0;
    for (const route of rows) {
      try {
        await generateAndCacheDescription(
          String(route.id),
          route.title,
          route.category ?? 'tour',
          route.location_type,
          route.description,
        );
        count++;
      } catch {
        // skip and continue
      }
    }

    return count;
  } catch {
    return 0;
  }
}
