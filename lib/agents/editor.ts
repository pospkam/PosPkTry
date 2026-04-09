/**
 * lib/agents/editor.ts
 *
 * Editor — AI-редактор описаний туров.
 * Запускается раз в сутки через /api/cron/editor.
 *
 * Находит туры с короткими или устаревшими описаниями и переписывает их AI.
 * Результат сохраняется в route_description_cache.
 *
 * Критерии для перезаписи:
 *   - description < 300 символов
 *   - нет записи в route_description_cache (или старше 90 дней)
 *   - маршрут активен (is_published = true или published = true)
 *
 * Лимит: 10 маршрутов за запуск (не перегружать AI-бюджет).
 */

import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface EditorResult {
  processed: number;
  improved: number;
  errors: number;
  duration_ms: number;
}

const BATCH_SIZE = 10;
const MIN_DESCRIPTION_LENGTH = 300;

async function tgSend(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch {
    // Silent fail
  }
}

interface TourRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  duration_days: number | null;
  region: string | null;
}

async function findToursNeedingImprovement(): Promise<TourRow[]> {
  const { rows } = await pool.query<TourRow>(`
    SELECT
      t.id,
      t.title,
      t.description,
      t.category,
      t.duration_days,
      t.region
    FROM operator_tours t
    LEFT JOIN route_description_cache c ON c.route_id = t.id
      AND c.generated_at > NOW() - INTERVAL '90 days'
    WHERE t.is_published = true
      AND c.route_id IS NULL
      AND (t.description IS NULL OR LENGTH(t.description) < $1)
    ORDER BY t.created_at DESC
    LIMIT $2
  `, [MIN_DESCRIPTION_LENGTH, BATCH_SIZE]);
  return rows;
}

async function generateDescription(tour: TourRow): Promise<string | null> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты профессиональный редактор туристических описаний для платформы TourHab (Камчатка).
Пиши на русском языке. Стиль: живой, убедительный, фактически точный.
Длина: 350-500 слов. Без emoji. Без markdown заголовков. Один сплошной абзац или 2-3 коротких абзаца.
Упоминай конкретные природные объекты Камчатки (вулканы, гейзеры, реки, океан) когда это уместно.`,
    },
    {
      role: 'user',
      content: `Напиши описание тура:
Название: ${tour.title}
${tour.category ? `Категория: ${tour.category}` : ''}
${tour.duration_days ? `Продолжительность: ${tour.duration_days} дн.` : ''}
${tour.region ? `Район: ${tour.region}` : ''}
${tour.description ? `Текущее описание (улучши его): ${tour.description}` : 'Описания нет — создай с нуля.'}`,
    },
  ];

  try {
    const result = await callAIFast(messages);
    return result?.trim() ?? null;
  } catch {
    return null;
  }
}

async function saveToCache(routeId: string, description: string): Promise<void> {
  await pool.query(`
    INSERT INTO route_description_cache (route_id, description, generated_at, model)
    VALUES ($1, $2, NOW(), 'editor-agent')
    ON CONFLICT (route_id) DO UPDATE
      SET description   = EXCLUDED.description,
          generated_at  = NOW(),
          model         = 'editor-agent'
  `, [routeId, description]);
}

export async function runEditor(): Promise<EditorResult> {
  const start = Date.now();
  let processed = 0;
  let improved = 0;
  let errors = 0;

  let tours: TourRow[];
  try {
    tours = await findToursNeedingImprovement();
  } catch {
    return { processed: 0, improved: 0, errors: 1, duration_ms: Date.now() - start };
  }

  for (const tour of tours) {
    processed++;
    const newDescription = await generateDescription(tour);
    if (!newDescription) {
      errors++;
      continue;
    }
    try {
      await saveToCache(tour.id, newDescription);
      improved++;
    } catch {
      errors++;
    }
  }

  if (improved > 0) {
    await tgSend(
      `<b>Editor</b> — обновил ${improved} описаний туров\n` +
      `(обработано: ${processed}, ошибок: ${errors})`
    );
  }

  return { processed, improved, errors, duration_ms: Date.now() - start };
}
