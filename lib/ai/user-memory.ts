/**
 * lib/ai/user-memory.ts
 *
 * Персистентная память Кузьмича.
 * Сохраняет предпочтения пользователя между сессиями и
 * инджектирует контекст в system prompt каждой новой беседы.
 */

import { pool } from '@/lib/db-pool';
import { agentMemory } from '@/lib/agents/memory/agent-memory';

export interface UserMemory {
  user_id:              string;
  preferred_activities: string[];
  preferred_locations:  string[];
  travel_style:         string | null;
  group_size:           string | null;
  budget_level:         string | null;
  ai_notes:             string | null;
  sessions_count:       number;
  messages_count:       number;
  // Расширенные поля (migration 147)
  budget_max:           number | null;
  group_size_num:       number | null;
  preferred_months:     number[];
  viewed_tour_ids:      number[];
  last_intent:          string | null;
}

// ── Загрузка памяти ───────────────────────────────────────────────
export async function loadUserMemory(userId: string): Promise<UserMemory | null> {
  try {
    const r = await pool.query<UserMemory>(
      `SELECT user_id, preferred_activities, preferred_locations,
              travel_style, group_size, budget_level, ai_notes,
              sessions_count, messages_count,
              budget_max, group_size_num,
              COALESCE(preferred_months, '{}') AS preferred_months,
              COALESCE(viewed_tour_ids, '{}')  AS viewed_tour_ids,
              last_intent
       FROM user_ai_memory WHERE user_id = $1`,
      [userId],
    );
    if (!r.rows[0]) return null;
    const row = r.rows[0];
    return {
      ...row,
      preferred_months: row.preferred_months ?? [],
      viewed_tour_ids:  row.viewed_tour_ids  ?? [],
    };
  } catch {
    return null;
  }
}

// ── Создать/обновить базовые поля памяти ─────────────────────────
export async function upsertUserMemory(
  userId:    string,
  patch: Partial<Pick<UserMemory,
    'preferred_activities' | 'preferred_locations' |
    'travel_style' | 'group_size' | 'budget_level' | 'ai_notes' |
    'budget_max' | 'group_size_num' | 'preferred_months' | 'viewed_tour_ids' | 'last_intent'
  >>,
  incrementMessages = false,
  newSession        = false,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO user_ai_memory (user_id, preferred_activities, preferred_locations,
         travel_style, group_size, budget_level, ai_notes, sessions_count, messages_count,
         budget_max, group_size_num, preferred_months, viewed_tour_ids, last_intent)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               CASE WHEN $8 THEN 1 ELSE 0 END,
               CASE WHEN $9 THEN 1 ELSE 0 END,
               $10, $11, $12, $13, $14)
       ON CONFLICT (user_id) DO UPDATE SET
         preferred_activities = CASE WHEN $2 <> '{}' THEN $2 ELSE user_ai_memory.preferred_activities END,
         preferred_locations  = CASE WHEN $3 <> '{}' THEN $3 ELSE user_ai_memory.preferred_locations  END,
         travel_style         = COALESCE($4, user_ai_memory.travel_style),
         group_size           = COALESCE($5, user_ai_memory.group_size),
         budget_level         = COALESCE($6, user_ai_memory.budget_level),
         ai_notes             = COALESCE($7, user_ai_memory.ai_notes),
         sessions_count       = user_ai_memory.sessions_count + CASE WHEN $8 THEN 1 ELSE 0 END,
         messages_count       = user_ai_memory.messages_count + CASE WHEN $9 THEN 1 ELSE 0 END,
         budget_max           = COALESCE($10, user_ai_memory.budget_max),
         group_size_num       = COALESCE($11, user_ai_memory.group_size_num),
         preferred_months     = CASE WHEN $12 <> '{}' THEN $12 ELSE user_ai_memory.preferred_months END,
         viewed_tour_ids      = CASE
           WHEN $13 <> '{}' THEN (
             SELECT ARRAY(SELECT DISTINCT unnest(user_ai_memory.viewed_tour_ids || $13) LIMIT 50)
           )
           ELSE user_ai_memory.viewed_tour_ids
         END,
         last_intent          = COALESCE($14, user_ai_memory.last_intent),
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
        patch.budget_max        ?? null,
        patch.group_size_num    ?? null,
        patch.preferred_months  ?? [],
        patch.viewed_tour_ids   ?? [],
        patch.last_intent       ?? null,
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

const MONTH_KEYWORDS: Record<string, number> = {
  январ: 1,  январе: 1,  январь: 1,
  феврал: 2, феврале: 2,
  март: 3,   марте: 3,
  апрел: 4,  апреле: 4,
  май: 5,    мае: 5,
  июн: 6,    июне: 6,
  июл: 7,    июле: 7,
  август: 8, августе: 8,
  сентябр: 9, сентябре: 9,
  октябр: 10, октябре: 10,
  ноябр: 11,  ноябре: 11,
  декабр: 12, декабре: 12,
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

  // Уровень бюджета
  let budget_level: string | null = null;
  if (lower.includes('бюджет') || lower.includes('дёшево') || lower.includes('эконом')) budget_level = 'budget';
  else if (lower.includes('премиум') || lower.includes('vip') || lower.includes('дорог')) budget_level = 'premium';

  // Числовой бюджет: "150 тысяч", "200к", "300 000 руб", "50 000"
  let budget_max: number | null = null;
  const budgetMatch =
    text.match(/(\d[\d\s]*)\s*(?:тыс(?:яч)?(?:[иь])?|к\b)/i) ||
    text.match(/(\d[\d\s]{2,})\s*(?:руб|₽)/i);
  if (budgetMatch) {
    const raw = budgetMatch[1].replace(/\s/g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      budget_max = /тыс|к\b/i.test(budgetMatch[0]) ? num * 1000 : num;
    }
  }

  // Числовой размер группы: "нас 4 человека", "2 человека", "группа 6"
  let group_size_num: number | null = null;
  const groupMatch =
    text.match(/(?:нас|едем|поедем|группа|человек[а]?)\s+(\d+)/i) ||
    text.match(/(\d+)\s+(?:человек|чел|чела|чел\.)/i);
  if (groupMatch) {
    const n = parseInt(groupMatch[1], 10);
    if (n >= 1 && n <= 100) group_size_num = n;
  }

  // Предпочтительные месяцы
  const preferred_months: number[] = [];
  for (const [kw, month] of Object.entries(MONTH_KEYWORDS)) {
    if (lower.includes(kw) && !preferred_months.includes(month)) {
      preferred_months.push(month);
    }
  }

  // Намерение
  let last_intent: string | null = null;
  if (/бронир|забронир|записи|оформи|беру|берём/i.test(text))        last_intent = 'booking';
  else if (/сравни|что лучше|отличи|разница/i.test(text))            last_intent = 'comparing';
  else if (/сколько стоит|цена|стоимость|бюджет/i.test(text))        last_intent = 'pricing';
  else if (/план|маршрут|программ|итинерар/i.test(text))             last_intent = 'planning';
  else if (/погода|сезон|когда лучше|когда ехать/i.test(text))       last_intent = 'timing';

  return {
    preferred_activities: activities,
    preferred_locations:  locations,
    ...(travel_style       ? { travel_style }        : {}),
    ...(budget_level       ? { budget_level }        : {}),
    ...(budget_max         ? { budget_max }          : {}),
    ...(group_size_num     ? { group_size_num }      : {}),
    ...(preferred_months.length ? { preferred_months } : {}),
    ...(last_intent        ? { last_intent }         : {}),
  };
}

// ── Генерация context-строки для system prompt ─────────────────
export function buildMemoryContext(mem: UserMemory, trips?: TripRecord[]): string {
  if (mem.sessions_count === 0 && mem.messages_count === 0) return '';

  const parts: string[] = [];

  if (mem.sessions_count > 0) {
    parts.push(`Это ${mem.sessions_count + 1}-я беседа с пользователем — он уже был здесь раньше.`);
  }

  const acts = mem.preferred_activities;
  if (acts.length > 0) {
    const labels: Record<string, string> = {
      fishing: 'рыбалку', trekking: 'треккинг', volcano: 'вулканы',
      thermal: 'горячие источники', bears: 'медведей', helicopter: 'вертолётные экскурсии',
      boat_trip: 'морские туры', snowmobile: 'снегоходы', rafting: 'рафтинг',
    };
    const actLabels = acts.map(a => labels[a] ?? a).join(', ');
    parts.push(`Интересуется: ${actLabels}.`);
  }

  if (mem.preferred_locations.length > 0) {
    parts.push(`Локации: ${mem.preferred_locations.join(', ')}.`);
  }

  if (mem.travel_style) {
    const styleLabel: Record<string, string> = {
      family: 'семейный отдых', solo: 'индивидуальные туры',
      adventure: 'экстрим и приключения', comfort: 'комфорт и люкс',
    };
    parts.push(`Стиль: ${styleLabel[mem.travel_style] ?? mem.travel_style}.`);
  }

  // Числовой размер группы (точнее чем строковый)
  if (mem.group_size_num) {
    parts.push(`Группа: ${mem.group_size_num} чел.`);
  } else if (mem.group_size) {
    const groupLabel: Record<string, string> = {
      solo: '1 чел.', couple: '2 чел.', small: '3-5 чел.', large: '6+ чел.',
    };
    parts.push(`Группа: ${groupLabel[mem.group_size] ?? mem.group_size}.`);
  }

  // Числовой бюджет (точнее чем уровень)
  if (mem.budget_max) {
    parts.push(`Бюджет: до ${mem.budget_max.toLocaleString('ru-RU')} руб.`);
  } else if (mem.budget_level) {
    const budgetLabel: Record<string, string> = {
      budget: 'эконом', mid: 'средний', premium: 'премиум',
    };
    parts.push(`Бюджет: ${budgetLabel[mem.budget_level] ?? mem.budget_level}.`);
  }

  // Предпочтительные месяцы
  if (mem.preferred_months?.length > 0) {
    const MONTH_NAMES = ['', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
      'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const monthNames = mem.preferred_months.map(m => MONTH_NAMES[m] ?? m).join(', ');
    parts.push(`Планирует ехать в: ${monthNames}.`);
  }

  // Последнее намерение — подсказка для AI
  if (mem.last_intent === 'booking') {
    parts.push('Был близок к бронированию — если уместно, предложи конкретный следующий шаг.');
  } else if (mem.last_intent === 'planning') {
    parts.push('Активно планирует маршрут.');
  }

  if (mem.ai_notes) {
    parts.push(mem.ai_notes);
  }

  // История поездок
  if (trips && trips.length > 0) {
    const statusLabel: Record<string, string> = {
      completed: 'завершен', confirmed: 'подтвержден', pending: 'ожидание',
      cancelled: 'отменен', cancelled_by_tourist: 'отменен туристом',
    };
    const tripLines = trips.map(t => {
      const st = statusLabel[t.status] ?? t.status;
      const ratingStr = t.rating ? `, оценка ${t.rating}/5` : '';
      return `- ${t.title} (${t.booking_date}, ${st}, ${t.participants} чел.${ratingStr})`;
    });
    parts.push(`\nИстория поездок:\n${tripLines.join('\n')}`);
  }

  if (parts.length === 0) return '';

  return `\n\n[ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ]\n${parts.join(' ')}\nАдаптируй рекомендации под этот профиль. Не упоминай явно что "ты запомнил".`;
}

// ── Трекинг просмотренных туров ───────────────────────────────────
export async function addViewedTour(userId: string, tourId: number): Promise<void> {
  try {
    await pool.query(
      `UPDATE user_ai_memory
       SET viewed_tour_ids = (
         SELECT ARRAY(SELECT DISTINCT unnest(viewed_tour_ids || ARRAY[$2::int]) LIMIT 50)
       ),
       last_updated = NOW()
       WHERE user_id = $1`,
      [userId, tourId],
    );
  } catch {
    // non-critical
  }
}

// ── Trip history loader ────────────────────────────────────────────
export interface TripRecord {
  title:        string;
  booking_date: string;
  status:       string;
  participants: number;
  rating:       number | null;
}

export async function loadTripHistory(userId: string): Promise<TripRecord[]> {
  try {
    // Legacy bookings + operator bookings merged // allow:
    const legacySQL = `SELECT t.title, b.date::text AS booking_date, b.status, b.participants, NULL::int AS rating FROM bookings b JOIN tours t ON t.id = b.tour_id WHERE b.user_id = $1 ORDER BY b.date DESC LIMIT 10`; // allow:
    const [legacy, opBookings] = await Promise.all([
      pool.query<TripRecord>(legacySQL, [userId]),
      pool.query<TripRecord>(
        `SELECT ot.title, ob.booking_date::text, ob.booking_status AS status,
                ob.participants, r.rating
         FROM operator_bookings ob
         JOIN operator_tours ot ON ot.id = ob.operator_tour_id
         JOIN users u ON u.email = ob.tourist_email
         LEFT JOIN operator_tour_reviews r
           ON r.tour_id = ob.operator_tour_id AND r.author_name = u.name
         WHERE u.id = $1
         ORDER BY ob.booking_date DESC LIMIT 10`,
        [userId],
      ),
    ]);

    const all = [...legacy.rows, ...opBookings.rows];
    all.sort((a, b) => (b.booking_date > a.booking_date ? 1 : -1));
    return all.slice(0, 10);
  } catch {
    return [];
  }
}

// ── AI-синтез заметок о пользователе (cross-chat memory) ─────────
/**
 * После каждого диалога вызывается fire-and-forget.
 * AI читает последние сообщения и обновляет ai_notes —
 * конкретные факты: даты, группу, пожелания, ограничения.
 * Это то что теряется при смене чата и нигде больше не хранится.
 */
export async function synthesizeUserNotes(
  userId: string,
  recentMessages: Array<{ role: string; content: string }>,
  existingNotes: string | null,
): Promise<void> {
  if (!userId || recentMessages.length < 2) return;

  try {
    const { callAIFast } = await import('@/lib/ai/providers');

    const userTurns = recentMessages
      .filter(m => m.role === 'user')
      .slice(-6)
      .map(m => m.content)
      .join('\n');

    if (userTurns.length < 20) return;

    const prompt = `Ты — система памяти AI-турагента. Прочитай сообщения туриста и извлеки конкретные факты которые стоит запомнить для следующих разговоров.

Сообщения туриста:
${userTurns}

${existingNotes ? `Текущие заметки (дополни, не дублируй):\n${existingNotes}\n` : ''}

Напиши 1-3 предложения с конкретными фактами: даты поездки, количество человек, пожелания, ограничения, упомянутые туры. Только факты, без пересказа. Если ничего конкретного — ответь "нет".`;

    const result = await callAIFast([
      { role: 'user', content: prompt },
    ]);

    if (!result || result.trim() === 'нет' || result.trim().toLowerCase() === 'нет.') return;

    const notes = result.trim().slice(0, 500);
    await upsertUserMemory(userId, { ai_notes: notes });
  } catch {
    // fire-and-forget — не блокируем
  }
}

// ── Reverse bridge: Agent insights for tourist chat system prompt ──
let _agentInsightsCache: { data: string; ts: number } | null = null;
const AGENT_INSIGHTS_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Reads active alerts from agent memory (eco zone alerts, rescue weather alerts)
 * and formats them for injection into Kuzmich's system prompt.
 * Cached for 3 minutes to avoid redundant DB queries on every chat message.
 */
export async function buildAgentInsightsForTourist(): Promise<string> {
  if (_agentInsightsCache && Date.now() - _agentInsightsCache.ts < AGENT_INSIGHTS_TTL) {
    return _agentInsightsCache.data;
  }
  try {
    const [ecoAlerts, rescueAlerts] = await Promise.all([
      agentMemory.recall('eco', 'zone_alert', 3),
      agentMemory.recall('rescue', 'weather_alert', 3),
    ]);

    const parts: string[] = [];
    for (const alert of ecoAlerts) {
      const val = alert.value as Record<string, unknown>;
      parts.push(`[Эко-предупреждение]: ${val.zone ?? 'зона'} — ${val.message ?? JSON.stringify(val)}`);
    }
    for (const alert of rescueAlerts) {
      const val = alert.value as Record<string, unknown>;
      parts.push(`[Безопасность]: ${val.area ?? 'район'} — ${val.message ?? JSON.stringify(val)}`);
    }

    const result = parts.length === 0
      ? ''
      : `\n\n[ПЛАТФОРМЕННЫЕ ПРЕДУПРЕЖДЕНИЯ]\n${parts.join('\n')}\nУчитывай эти предупреждения при рекомендациях. Если зона перегружена или опасна — предупреди туриста.`;
    _agentInsightsCache = { data: result, ts: Date.now() };
    return result;
  } catch {
    _agentInsightsCache = { data: '', ts: Date.now() };
    return '';
  }
}
