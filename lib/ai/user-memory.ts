/**
 * lib/ai/user-memory.ts
 *
 * Персистентная память Кузьмича.
 * Сохраняет предпочтения пользователя между сессиями и
 * инджектирует контекст в system prompt каждой новой беседы.
 */

import { pool } from '@/lib/db-pool';

export interface UserMemory {
  user_id:              number;
  preferred_activities: string[];
  preferred_locations:  string[];
  travel_style:         string | null;
  group_size:           string | null;
  budget_level:         string | null;
  ai_notes:             string | null;
  sessions_count:       number;
  messages_count:       number;
}

// ── Загрузка памяти ───────────────────────────────────────────────
export async function loadUserMemory(userId: number): Promise<UserMemory | null> {
  try {
    const r = await pool.query<UserMemory>(
      `SELECT user_id, preferred_activities, preferred_locations,
              travel_style, group_size, budget_level, ai_notes,
              sessions_count, messages_count
       FROM user_ai_memory WHERE user_id = $1`,
      [userId],
    );
    return r.rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── Создать/обновить базовые поля памяти ─────────────────────────
export async function upsertUserMemory(
  userId:    number,
  patch: Partial<Pick<UserMemory,
    'preferred_activities' | 'preferred_locations' |
    'travel_style' | 'group_size' | 'budget_level' | 'ai_notes'
  >>,
  incrementMessages = false,
  newSession        = false,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO user_ai_memory (user_id, preferred_activities, preferred_locations,
         travel_style, group_size, budget_level, ai_notes, sessions_count, messages_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               CASE WHEN $8 THEN 1 ELSE 0 END,
               CASE WHEN $9 THEN 1 ELSE 0 END)
       ON CONFLICT (user_id) DO UPDATE SET
         preferred_activities = CASE WHEN $2 <> '{}' THEN $2 ELSE user_ai_memory.preferred_activities END,
         preferred_locations  = CASE WHEN $3 <> '{}' THEN $3 ELSE user_ai_memory.preferred_locations  END,
         travel_style         = COALESCE($4, user_ai_memory.travel_style),
         group_size           = COALESCE($5, user_ai_memory.group_size),
         budget_level         = COALESCE($6, user_ai_memory.budget_level),
         ai_notes             = COALESCE($7, user_ai_memory.ai_notes),
         sessions_count       = user_ai_memory.sessions_count + CASE WHEN $8 THEN 1 ELSE 0 END,
         messages_count       = user_ai_memory.messages_count + CASE WHEN $9 THEN 1 ELSE 0 END,
         last_updated         = NOW()`,
      [
        userId,
        patch.preferred_activities ?? [],
        patch.preferred_locations  ?? [],
        patch.travel_style         ?? null,
        patch.group_size           ?? null,
        patch.budget_level         ?? null,
        patch.ai_notes             ?? null,
        newSession,
        incrementMessages,
      ],
    );
  } catch {
    // Никогда не прерываем основной поток
  }
}

// ── Извлечение интересов из сообщения пользователя ──────────────
const ACTIVITY_KEYWORDS: Record<string, string> = {
  рыбал: 'fishing',     fishing:   'fishing',
  рыб:   'fishing',     трекк:     'trekking',
  поход: 'trekking',    trek:      'trekking',
  вулкан:'volcano',     volcano:   'volcano',
  источник: 'thermal',  термал:    'thermal',
  медвед:   'bears',    медведь:   'bears',
  вертолёт: 'helicopter',helicopter:'helicopter',
  kayak:    'boat_trip', лодк:      'boat_trip',
  снегоход: 'snowmobile',
};

const LOCATION_KEYWORDS: Record<string, string> = {
  курильск: 'kurilskoye',
  мутновск: 'mutnovsky',
  авачинск: 'avachinsky',
  толбачик: 'tolbachik',
  паратунк: 'paratunka',
  налычево: 'nalychevo',
  хари:     'kharitonov',
};

export function extractMemoryFromMessage(text: string): Partial<UserMemory> {
  const lower = text.toLowerCase();
  const activities: string[] = [];
  const locations:  string[] = [];

  for (const [kw, val] of Object.entries(ACTIVITY_KEYWORDS)) {
    if (lower.includes(kw) && !activities.includes(val)) activities.push(val);
  }
  for (const [kw, val] of Object.entries(LOCATION_KEYWORDS)) {
    if (lower.includes(kw) && !locations.includes(val)) locations.push(val);
  }

  // Стиль поездки
  let travel_style: string | null = null;
  if (lower.includes('семь') || lower.includes('дети') || lower.includes('ребён')) travel_style = 'family';
  else if (lower.includes('один') || lower.includes('solo') || lower.includes('сам')) travel_style = 'solo';
  else if (lower.includes('экстрим') || lower.includes('adventure')) travel_style = 'adventure';
  else if (lower.includes('комфорт') || lower.includes('люкс') || lower.includes('luxury')) travel_style = 'comfort';

  // Бюджет
  let budget_level: string | null = null;
  if (lower.includes('бюджет') || lower.includes('дёшево') || lower.includes('эконом')) budget_level = 'budget';
  else if (lower.includes('премиум') || lower.includes('vip') || lower.includes('дорог')) budget_level = 'premium';

  return {
    preferred_activities: activities,
    preferred_locations:  locations,
    ...(travel_style  ? { travel_style }  : {}),
    ...(budget_level  ? { budget_level }  : {}),
  };
}

// ── Генерация context-строки для system prompt ─────────────────
export function buildMemoryContext(mem: UserMemory): string {
  if (mem.sessions_count === 0 && mem.messages_count === 0) return '';

  const parts: string[] = [];

  if (mem.sessions_count > 0) {
    parts.push(`Это ваша ${mem.sessions_count + 1}-я беседа с пользователем — он уже был здесь раньше.`);
  }

  const acts = mem.preferred_activities;
  if (acts.length > 0) {
    const labels: Record<string, string> = {
      fishing: 'рыбалку', trekking: 'треккинг', volcano: 'вулканы',
      thermal: 'горячие источники', bears: 'медведей', helicopter: 'вертолётные экскурсии',
      boat_trip: 'морские туры', snowmobile: 'снегоходы',
    };
    const actLabels = acts.map(a => labels[a] ?? a).join(', ');
    parts.push(`Пользователь интересуется: ${actLabels}.`);
  }

  if (mem.preferred_locations.length > 0) {
    parts.push(`Упоминаемые локации: ${mem.preferred_locations.join(', ')}.`);
  }

  if (mem.travel_style) {
    const styleLabel: Record<string, string> = {
      family: 'семейный отдых', solo: 'индивидуальные туры',
      adventure: 'экстрим и приключения', comfort: 'комфорт и люкс',
    };
    parts.push(`Стиль: ${styleLabel[mem.travel_style] ?? mem.travel_style}.`);
  }

  if (mem.budget_level) {
    const budgetLabel: Record<string, string> = {
      budget: 'эконом-бюджет', mid: 'средний бюджет', premium: 'премиум',
    };
    parts.push(`Бюджет: ${budgetLabel[mem.budget_level] ?? mem.budget_level}.`);
  }

  if (mem.ai_notes) {
    parts.push(mem.ai_notes);
  }

  if (parts.length === 0) return '';

  return `\n\n[ПАМЯТЬ О ПОЛЬЗОВАТЕЛЕ]\n${parts.join(' ')}\nУчитывай эти данные при ответах — адаптируй рекомендации. Не упоминай явно что "ты запомнил".`;
}
