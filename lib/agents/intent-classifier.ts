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
  tourist_recommend: [
    'рекомендуй тур', 'посоветуй', 'хочу тур', 'что посмотреть на камчатке',
    'хочу на камчатку', 'вулкан', 'рыбалка', 'медведи', 'гейзер', 'трекинг',
    'горячие источники', 'маршрут на камчатке', 'отдых на камчатке',
  ],
  unknown: [],
};

const ADMIN_INTENTS    = new Set<AgentIntent>(['admin_digest', 'admin_health', 'admin_leads']);
const OPERATOR_INTENTS = new Set<AgentIntent>(['op_tours_summary', 'op_bookings_today', 'op_revenue']);

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
