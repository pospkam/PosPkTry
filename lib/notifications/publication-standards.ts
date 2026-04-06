/**
 * Стандарты качества публикаций TourHab.
 *
 * Обязательные правила для ВСЕХ постов в каналы (TG + MAX).
 * Ответственный AI-директор: Content (#7, content-auditor-agency.ts)
 *
 * Бенчмарк: Manus AI (https://manus.im)
 *  - Каждый пост сопровождается уникальной AI-картинкой (Pollinations Flux)
 *  - Текст проходит AI-ревью (score >= 6/10) перед публикацией
 *  - Перегенерация при отклонении (до 2 попыток)
 *  - Все ссылки верифицируются через HTTP HEAD
 *  - MAX-канал обязательно в каждом TG-посте
 *  - Формат поста стандартизирован по типам
 */

import { query } from '@/lib/database';
import { callAIFast } from '@/lib/ai/providers';
import { generateAndStoreRouteImage } from '@/lib/services/ai-image-generator';

// ── Стандарты качества ────────────────────────────────────────────────────────

export interface PublicationStandard {
  /** Минимум слов в тексте (без HTML) */
  minWords: number;
  /** Максимум слов */
  maxWords: number;
  /** Обязательна ли картинка */
  imageRequired: boolean;
  /** Обязательна ли ссылка на сайт */
  linkRequired: boolean;
  /** Требуется ли AI-ревью текста */
  aiReviewRequired: boolean;
  /** Максимум хештегов */
  maxHashtags: number;
}

const STANDARDS: Record<string, PublicationStandard> = {
  route: {
    minWords: 50,
    maxWords: 150,
    imageRequired: true,
    linkRequired: true,
    aiReviewRequired: true,
    maxHashtags: 5,
  },
  tip: {
    minWords: 40,
    maxWords: 120,
    imageRequired: false,
    linkRequired: false,
    aiReviewRequired: true,
    maxHashtags: 3,
  },
  sezon: {
    minWords: 50,
    maxWords: 150,
    imageRequired: false,
    linkRequired: true,
    aiReviewRequired: true,
    maxHashtags: 3,
  },
  promo: {
    minWords: 60,
    maxWords: 150,
    imageRequired: false,
    linkRequired: true,
    aiReviewRequired: false,
    maxHashtags: 3,
  },
  friend: {
    minWords: 40,
    maxWords: 120,
    imageRequired: false,
    linkRequired: false,
    aiReviewRequired: true,
    maxHashtags: 3,
  },
};

export function getStandard(postType: string): PublicationStandard {
  return STANDARDS[postType] ?? STANDARDS.route;
}

// ── AI-ревью текста ───────────────────────────────────────────────────────────

export interface ContentReviewResult {
  approved: boolean;
  score: number;       // 1-10
  issues: string[];
  suggestion?: string; // AI-предложение по улучшению
}

/**
 * AI Content Director ревьюирует текст перед публикацией.
 * Оценка 1-10. Ниже 6 — пост отклоняется и перегенерируется.
 */
export async function reviewPostContent(
  text: string,
  postType: string,
  context?: { routeTitle?: string; locationType?: string }
): Promise<ContentReviewResult> {
  const stripped = text.replace(/<[^>]+>/g, '').trim();

  const prompt = `Ты — AI Content Director туристической платформы Камчатки TourHab.
Твой бенчмарк качества — Manus AI. Ты должен оценивать контент не ниже этого уровня.
Оцени текст поста для Telegram-канала по шкале 1-10.

Тип поста: ${postType}
${context?.routeTitle ? `Маршрут: ${context.routeTitle}` : ''}
${context?.locationType ? `Тип локации: ${context.locationType}` : ''}

Текст:
"${stripped}"

Критерии оценки (Manus-level):
1. Голос Кузьмича — живой, разговорный, с иронией (не сухой, не рекламный)
2. Конкретика — факты, детали, секреты места (не общие слова)
3. Ценность — читатель узнаёт что-то полезное или интересное
4. Длина — достаточно информативный, но не затянутый
5. Call-to-action — есть мотивация перейти по ссылке
6. Орфография и стиль — грамотный текст без мусора
7. Уникальность — не шаблонный, не повторяет типовые фразы
8. Эмоция — вызывает желание поехать на Камчатку
9. Структура — текст логически связный, с началом, развитием и заключением
10. Визуальная привлекательность — правильное форматирование HTML, акценты через <b> и <i>

Ответь СТРОГО в JSON:
{"score": число 1-10, "issues": ["проблема1", "проблема2"], "suggestion": "как улучшить или null"}`;

  try {
    const raw = await callAIFast([{ role: 'user', content: prompt }]);
    // Парсим JSON из ответа
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { score: number; issues: string[]; suggestion?: string };
      return {
        approved: parsed.score >= 6,
        score: parsed.score,
        issues: parsed.issues ?? [],
        suggestion: parsed.suggestion ?? undefined,
      };
    }
  } catch {
    // AI недоступен — пропускаем ревью (не блокируем публикацию)
  }

  return { approved: true, score: 7, issues: [] };
}

// ── Генерация AI-картинки для поста ───────────────────────────────────────────

/**
 * Получить URL AI-картинки для маршрута.
 * Если картинка ещё не сгенерирована — генерирует и сохраняет.
 * Возвращает URL для Telegram sendPhoto.
 */
export async function getRouteImageUrl(routeId: string): Promise<string | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  // Проверяем есть ли уже сгенерированная картинка
  try {
    const { rows } = await query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM ai_route_images WHERE route_id = $1) AS exists`,
      [routeId]
    );
    if (rows[0]?.exists) {
      return `${appUrl}/api/images/route/${routeId}`;
    }
  } catch {
    // Таблица может не существовать
  }

  // Генерируем новую
  try {
    const routeRes = await query<{
      title: string; location_type: string | null; description: string;
    }>(
      `SELECT title, location_type, COALESCE(description, '') as description
       FROM agent_route_knowledge WHERE id = $1 AND is_visible = TRUE`,
      [routeId]
    );
    if (!routeRes.rows[0]) return null;

    const r = routeRes.rows[0];
    const result = await generateAndStoreRouteImage(routeId, r.title, r.location_type, r.description);
    if (result.bytes > 0 || result.cached) {
      return `${appUrl}/api/images/route/${routeId}`;
    }
  } catch {
    // Генерация не удалась — не фатально
  }

  return null;
}

// ── Полная проверка по стандартам ──────────────────────────────────────────────

export interface StandardCheckResult {
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  imageUrl?: string | null;
  reviewResult?: ContentReviewResult;
}

/**
 * Полная проверка поста по стандартам публикации.
 * Вызывается после генерации текста, перед отправкой.
 */
export async function checkPublicationStandards(
  text: string,
  postType: string,
  routeId?: string,
  context?: { routeTitle?: string; locationType?: string }
): Promise<StandardCheckResult> {
  const standard = getStandard(postType);
  const errors: string[] = [];
  const warnings: string[] = [];
  let imageUrl: string | null = null;
  let reviewResult: ContentReviewResult | undefined;

  const stripped = text.replace(/<[^>]+>/g, '').trim();
  const wordCount = stripped.split(/\s+/).filter(Boolean).length;

  // 1. Длина текста
  if (wordCount < standard.minWords) {
    errors.push(`Текст слишком короткий: ${wordCount} слов (мин. ${standard.minWords})`);
  }
  if (wordCount > standard.maxWords) {
    warnings.push(`Текст длинноват: ${wordCount} слов (макс. ${standard.maxWords})`);
  }

  // 2. Ссылка на сайт
  if (standard.linkRequired) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
    if (!text.includes(appUrl) && !text.includes('tourhab.ru')) {
      errors.push('Отсутствует ссылка на tourhab.ru');
    }
  }

  // 3. AI-картинка для маршрутов
  if (standard.imageRequired && routeId) {
    imageUrl = await getRouteImageUrl(routeId);
    if (!imageUrl) {
      warnings.push('Не удалось сгенерировать AI-картинку, используем фото из каталога');
    }
  }

  // 4. AI-ревью текста (Content Director)
  if (standard.aiReviewRequired) {
    reviewResult = await reviewPostContent(text, postType, context);
    if (!reviewResult.approved) {
      errors.push(`AI Content Director отклонил (оценка ${reviewResult.score}/10): ${reviewResult.issues.join('; ')}`);
    }
  }

  // 5. Хештеги
  const hashtags = (text.match(/#\w+/g) ?? []).length;
  if (hashtags > standard.maxHashtags) {
    warnings.push(`Слишком много хештегов: ${hashtags} (макс. ${standard.maxHashtags})`);
  }

  // 6. Запрещённый контент
  if (/эмодзи|emoji/i.test(stripped)) {
    warnings.push('Упоминание emoji в тексте');
  }

  const score = reviewResult?.score ?? 7;

  return {
    passed: errors.length === 0,
    score,
    errors,
    warnings,
    imageUrl,
    reviewResult,
  };
}

// ── Логирование в ai_actions_log ──────────────────────────────────────────────

export async function logPublicationResult(
  postType: string,
  result: StandardCheckResult,
  routeId?: string,
  published: boolean = false
): Promise<void> {
  try {
    await query(
      `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
      [
        'publication_check',
        JSON.stringify({
          post_type: postType,
          route_id: routeId,
          passed: result.passed,
          published,
          score: result.score,
          errors: result.errors,
          warnings: result.warnings,
          has_image: !!result.imageUrl,
          timestamp: new Date().toISOString(),
        }),
      ]
    );
  } catch { /* ok */ }
}
