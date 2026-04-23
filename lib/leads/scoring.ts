/**
 * Быстрая оценка качества лида (0–100) без AI.
 * Вынесена из /api/leads/route.ts — единый источник для всех точек входа.
 */

export function computeQuickScore(
  name: string,
  phone: string,
  comment: string | undefined | null,
  source_data: Record<string, unknown> | undefined | null,
): number {
  let score = 0;

  // Имя (25 баллов)
  if (/^Турист_\d+$/i.test(name)) return 5;           // Автогенерированное — сразу низко
  if (name.trim().length < 3) return 5;
  if (/\s/.test(name.trim())) score += 25;             // Есть фамилия
  else score += 15;

  // Телефон (20 баллов)
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) score += 20;
  else score += 5;

  // Комментарий (40 баллов)
  if (comment) {
    const len = comment.trim().length;
    if (len > 80) score += 20;
    else if (len > 30) score += 12;
    else if (len > 10) score += 5;

    // Конкретика: цифры (бюджет/группа/даты)
    if (/\d{3,}/.test(comment)) score += 10;
    // Ключевые слова намерения
    if (/бюджет|руб|₽|чел|человек|дн[её]|ночь|недел/i.test(comment)) score += 10;
  }

  // Источник (15 баллов)
  if (source_data?.source === 'trip_planner') score += 15;
  else if (source_data?.source === 'homepage_cta') score += 10;
  else if (source_data?.source === 'route_page') score += 12;

  return Math.min(100, score);
}

/** Уровень лида по скорингу */
export interface LeadQuality {
  score: number;
  label: 'hot' | 'warm' | 'cold';
  labelRu: string;
  emoji: string;
}

export function classifyLead(score: number): LeadQuality {
  if (score >= 70) return { score, label: 'hot', labelRu: 'Горячий', emoji: '🔥' };
  if (score >= 40) return { score, label: 'warm', labelRu: 'Тёплый', emoji: '🟡' };
  return { score, label: 'cold', labelRu: 'Холодный', emoji: '❄️' };
}
