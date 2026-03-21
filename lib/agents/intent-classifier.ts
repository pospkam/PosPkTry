/**
 * Intent classifier — определяет намерение пользователя.
 *
 * Чистая функция, без зависимостей — легко тестируется.
 * Используется PlatformAgent как первый (быстрый) проход перед AI fallback.
 */

import type { AgentIntent } from './platform-agent';

// ── Keyword map ────────────────────────────────────────────────────────────────

export const INTENT_KEYWORDS: Record<AgentIntent, string[]> = {
  admin_digest:      ['дайджест', 'digest', 'сводка', 'итоги', 'обзор платформы'],
  admin_health:      ['здоровье', 'health', 'состояние системы', 'diag', 'диагностика'],
  admin_leads:       ['лиды', 'лидов', 'лидам', 'leads', 'заявки', 'обращения'],
  op_tours_summary:  ['мои туры', 'список туров', 'туры оператора', 'расписание туров', 'покажи туры'],
  op_bookings_today: ['бронирования сегодня', 'брони сегодня', 'сегодня бронирования'],
  op_revenue:        ['выручка', 'доходы', 'revenue', 'заработал', 'прибыль', 'деньги за'],
  op_create_tour:    [
    'создай тур', 'новый тур', 'добавь тур', 'создать тур', 'добавить тур',
    'хочу создать', 'сделай тур',
  ],
  op_fill_ai:        [
    'заполни тур', 'заполнить тур', 'ai заполнение', 'запусти заполнение',
    'автозаполнение', 'заполни ai', 'fill ai', 'автоматически заполни',
  ],
  op_add_slots:      [
    'добавь слоты', 'добавить слоты', 'новые слоты', 'слоты на', 'добавь даты',
    'добавить даты', 'расписание добавь', 'открой даты',
  ],
  tourist_recommend: [
    'рекомендуй тур', 'посоветуй', 'хочу тур', 'что посмотреть на камчатке',
    'хочу на камчатку', 'вулкан', 'рыбалка', 'медведи', 'гейзер', 'трекинг',
    'горячие источники', 'маршрут на камчатке', 'отдых на камчатке',
  ],
  unknown: [],
};

const ADMIN_INTENTS    = new Set<AgentIntent>(['admin_digest', 'admin_health', 'admin_leads']);
const OPERATOR_INTENTS = new Set<AgentIntent>([
  'op_tours_summary', 'op_bookings_today', 'op_revenue',
  'op_create_tour', 'op_fill_ai', 'op_add_slots',
]);

/**
 * Определить намерение по ключевым словам.
 *
 * @param message   Текст пользователя
 * @param role      Роль пользователя (фильтрует нерелевантные интенты)
 */
export function classifyIntentByKeywords(
  message: string,
  role?: string
): AgentIntent {
  const lower    = message.toLowerCase();
  const isAdmin  = role === 'admin';
  const isOp     = role === 'operator';

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [AgentIntent, string[]][]) {
    if (intent === 'unknown') continue;

    // Фильтрация по роли
    if (ADMIN_INTENTS.has(intent)    && !isAdmin) continue;
    if (OPERATOR_INTENTS.has(intent) && role && !isOp && !isAdmin) continue;

    if (keywords.some(k => lower.includes(k))) return intent;
  }

  return 'unknown';
}

export type { AgentIntent };
