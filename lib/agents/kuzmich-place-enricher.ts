/**
 * lib/agents/kuzmich-place-enricher.ts
 *
 * Генерирует kuzmich_review для мест Камчатки.
 *
 * kuzmich_review — личный взгляд Кузьмича на место: 1-2 предложения
 * в голосе опытного местного гида. Акцент на безопасности, характере
 * места, том что турист не узнает из Википедии.
 *
 * Алгоритм:
 * 1. Выбирает places WHERE kuzmich_review IS NULL AND is_visible = true
 * 2. Для каждого места — опциональный скрейп 2GIS через Bright Data
 * 3. Генерирует review через callAIWaterfall()
 * 4. Сохраняет в places.kuzmich_review
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import { fetchViaBrightData } from '@/lib/scraping/brightdata';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface KuzmichPlaceEnricherResult {
  processed: number;
  enriched: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}

interface PlaceRow {
  id: string;
  name: string;
  location_type: string | null;
  description: string | null;
  zone: string | null;
  lat: number;
  lng: number;
  altitude_m: number | null;
  difficulty_level: string | null;
  hazard_types: string[] | null;
  nearest_medical_km: number | null;
  terrain_type: string | null;
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  volcano:      'вулкан',
  hot_spring:   'термальный источник',
  geyser:       'гейзер',
  lake:         'озеро',
  mountain:     'гора',
  cape:         'мыс',
  bay:          'бухта',
  beach:        'пляж',
  river:        'река',
  waterfall:    'водопад',
  forest:       'лесной массив',
  park:         'природный парк',
  valley:       'долина',
  pass:         'перевал',
  plateau:      'плато',
};

async function loadPlacesNeedingReview(limit: number): Promise<PlaceRow[]> {
  const { rows } = await pool.query<PlaceRow>(
    `SELECT
       p.id,
       p.name,
       p.location_type,
       p.description,
       p.zone,
       p.lat,
       p.lng,
       lsp.altitude_m,
       lsp.difficulty_level,
       lsp.hazard_types,
       lsp.nearest_medical_km,
       lsp.terrain_type
     FROM places p
     LEFT JOIN location_safety_profile lsp ON lsp.agent_route_id = p.ark_id
     WHERE p.kuzmich_review IS NULL
       AND p.is_visible = true
       AND p.description IS NOT NULL
       AND LENGTH(p.description) >= 100
     ORDER BY RANDOM()
     LIMIT $1`,
    [limit],
  );
  return rows;
}

async function scrapeAdditionalContext(place: PlaceRow): Promise<string | null> {
  const query = encodeURIComponent(`${place.name} Камчатка`);
  const url = `https://2gis.ru/search/${query}`;
  const html = await fetchViaBrightData(url, { timeoutMs: 15_000 });
  if (!html) return null;

  // Очень простой экстракт: ищем текстовые блоки с описанием
  const textMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]{50,300})"/i);
  return textMatch?.[1] ?? null;
}

async function generateKuzmichReview(place: PlaceRow, extraContext: string | null): Promise<string | null> {
  const typeLabel = place.location_type
    ? (LOCATION_TYPE_LABELS[place.location_type] ?? place.location_type)
    : 'место';

  const safetyParts: string[] = [];
  if (place.altitude_m) safetyParts.push(`высота ${place.altitude_m}м`);
  if (place.difficulty_level) safetyParts.push(`сложность: ${place.difficulty_level}`);
  if (place.hazard_types?.length) safetyParts.push(`опасности: ${place.hazard_types.join(', ')}`);
  if (place.nearest_medical_km) safetyParts.push(`до медпомощи ${place.nearest_medical_km}км`);

  const safetyLine = safetyParts.length ? `\nБезопасность: ${safetyParts.join('; ')}` : '';
  const extraLine = extraContext ? `\nДополнительно: ${extraContext}` : '';

  const descSnippet = (place.description ?? '').slice(0, 600);

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты — Кузьмич, опытный проводник на Камчатке. Пишешь короткие личные заметки о местах для туристов.

Стиль:
- Говоришь как местный, знающий место изнутри
- 1-2 предложения, максимум 280 символов
- Акцент на характере места: что здесь особенное, чего ждать, что важно знать для безопасности
- Без рекламных штампов ("захватывающий", "незабываемый", "уникальный")
- Без emoji, без markdown, без заголовков
- Только факты и личный опыт
- На русском языке

Пример хорошего ответа: "Ключевская всегда живая — дышит, дымит, иногда злится. До вершины пускает не всех: следи за прогнозом активности и бери ледоруб, это не прогулка."`,
    },
    {
      role: 'user',
      content: `Место: ${place.name} (${typeLabel})${place.zone ? ', ' + place.zone : ''}${safetyLine}${extraLine}

Описание:
${descSnippet}

Напиши личную заметку Кузьмича об этом месте.`,
    },
  ];

  try {
    const result = await callAIWaterfall(messages);
    const trimmed = result?.trim();
    if (!trimmed || trimmed.length < 30) return null;
    // Обрезаем до 400 символов на случай если AI переборщил
    return trimmed.length > 400 ? trimmed.slice(0, 397) + '...' : trimmed;
  } catch {
    return null;
  }
}

async function saveKuzmichReview(placeId: string, review: string): Promise<void> {
  await pool.query(
    `UPDATE places SET kuzmich_review = $1, updated_at = NOW() WHERE id = $2`,
    [review, placeId],
  );
}

export async function runKuzmichPlaceEnricher(batchSize = 20): Promise<KuzmichPlaceEnricherResult> {
  const start = Date.now();
  let enriched = 0, skipped = 0, errors = 0;

  const places = await loadPlacesNeedingReview(batchSize);

  for (const place of places) {
    try {
      const extraContext = await scrapeAdditionalContext(place);
      const review = await generateKuzmichReview(place, extraContext);

      if (!review) {
        skipped++;
        continue;
      }

      await saveKuzmichReview(place.id, review);
      enriched++;
    } catch {
      errors++;
    }

    // Пауза между запросами чтобы не перегружать AI
    await new Promise(r => setTimeout(r, 500));
  }

  return {
    processed: places.length,
    enriched,
    skipped,
    errors,
    duration_ms: Date.now() - start,
  };
}
