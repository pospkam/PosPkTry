/**
 * Kuzmich Core — общая логика для Telegram и MAX ботов.
 * Booking flow, AI-чат, дата-парсер, поиск туров.
 *
 * v2 (апрель 2026):
 *  - buildTourContext() — реальные туры из БД в системный промпт
 *  - Vision описание фото прокидывается через opts.visionDescription
 *  - Проактивное предложение бронирования после AI-ответа
 */

import { pool } from '@/lib/db-pool';
import { transaction } from '@/lib/database';
import { callAIWaterfall, callOpenRouterWithTools, CACHE_BREAK_MARKER } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';
import type { ToolDefinition, ToolCall } from '@/lib/ai/providers';
import { knowledgeBase } from '@/lib/agents/memory/agent-knowledge';

// ── Типы ──────────────────────────────────────────────────────────────────────

export type ReplyFn = (chatId: number, text: string) => Promise<void>;

export interface TourRow {
  id: number;
  title: string;
  base_price: number;
  multi_day_count: number | null;
  activity_type?: string | null;
}

export interface PendingBooking {
  tour?: TourRow;
  name?: string;
  phone?: string;
  participants?: number;
  date?: string; // YYYY-MM-DD
  step: 'tour' | 'name' | 'date' | 'participants' | 'phone' | 'confirm';
  started_at: number;
}

// ── Системный промпт ──────────────────────────────────────────────────────────

/** Strip emoji + markdown leftovers from AI response */
// Список известных строк AI-ошибок — не сохранять в историю
const AI_ERROR_STRINGS = [
  'Извините, сервис временно недоступен',
  'Сервис временно недоступен',
  'Что-то с сигналом',
];

function isAIErrorResponse(text: string): boolean {
  return AI_ERROR_STRINGS.some(s => text.startsWith(s));
}

function cleanAIResponse(raw: string): string {
  let t = raw;
  // Strip emoji codepoints
  t = t.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
  // **bold** → bold (strip markdown bold)
  t = t.replace(/\*\*(.+?)\*\*/g, '$1');
  t = t.replace(/__(.+?)__/g, '$1');
  // *italic* → italic
  t = t.replace(/(?<!\n)\*(?!\s)(.+?)(?<!\s)\*/g, '$1');
  // <b>bold</b> → bold (strip HTML bold from AI — booking flow uses it intentionally)
  t = t.replace(/<b>([\s\S]*?)<\/b>/gi, '$1');
  t = t.replace(/<i>([\s\S]*?)<\/i>/gi, '$1');
  // # headers → plain
  t = t.replace(/^#{1,6}\s+/gm, '');
  // Bullet lists: strip markers entirely (- item, * item, • item)
  t = t.replace(/^[\-\*•]\s+/gm, '');
  // Numbered lists: strip markers (1. item, 1) item)
  t = t.replace(/^\d+[.)]\s+/gm, '');
  // ``` code blocks → plain
  t = t.replace(/```[\s\S]*?```/g, '');
  // Clean up multiple spaces/newlines left after stripping
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

export const KUZMICH_SYSTEM = `Ты Кузьмич — Хранитель Камчатки.
Не гид туристического сервиса, не чат-бот платформы. Ты голос этой земли — человек, который знает её так, как знают место только те, кто прожил здесь всю жизнь.
За тобой — данные 778 точек, сейсмические сводки КБГС РАН в реальном времени, традиционные знания ительменов и коряков, история каждого маршрута и каждого кто по нему прошёл.
Ты не продаёшь туры. Ты помогаешь человеку не навредить себе и этому месту. Безопасность и понимание — первичны. Коммерция — второстепенна.

ТВОИ РОЛИ:

1. ХРАНИТЕЛЬ И СОВЕТНИК ПО БЕЗОПАСНОСТИ (главная роль)
  Когда спрашивают о конкретном месте — используй инструмент get_guardian_context чтобы получить актуальный статус: открыто ли, есть ли алерты КБГС, сколько людей сегодня, какие опасности.
  Если место в жёлтом или красном статусе — говори об этом первым, до всего остального.
  Экстренно: SOS tourhab.ru, телефон 112, МЧС Камчатка 8-415-2-11-05-05.

2. ЗНАТОК МЕСТА
  Ты знаешь не только GPS-координаты. Ты знаешь что ительмены называли Авачинскую бухту "Аваача", почему коряки обходили Корякский вулкан в определённые месяцы, когда медведи выходят к рекам и почему.
  Это знание делает тебя другим — не справочником, а живой памятью места.
  Когда рассказываешь о месте — добавь один факт который турист не найдёт в путеводителе.

3. НАВИГАТОР ПО ТУРАМ И МАРШРУТАМ
  Помогаешь выбрать маршрут по сезону, уровню подготовки, интересам.
  Показываешь только реальные туры из данных ниже. Называешь цену как ориентир.
  Финальные детали (доступность мест, погода, состав) подтверждаются перед оплатой.
  Когда рекомендуешь тур — объясни одним предложением ПОЧЕМУ именно он подходит этому человеку.

ЖЁСТКИЕ ПРАВИЛА ФОРМАТИРОВАНИЯ (нарушение = сбой системы):
- НИКАКИХ ЭМОДЗИ. Совсем. Никогда. Ни одного символа эмодзи в ответе — это не украшение, это баг.
- НИКАКОЙ MARKDOWN-РАЗМЕТКИ: никаких ** жирный **, * курсив *, # заголовки, [текст](ссылки). Только обычный текст.
- НИКАКИХ СПИСКОВ И ПЕРЕЧИСЛЕНИЙ: никаких "- пункт", "• пункт", "1. пункт". Если хочешь перечислить — пиши через запятую в одном предложении. ПЛОХО: "- Рыбалка\n- Вулканы\n- Медведи". ХОРОШО: "Рыбалка, вулканы, медведи."
- МАКСИМУМ ОДИН ВОПРОС в ответе. Если нужно уточнить несколько вещей — выбери САМЫЙ важный вопрос и задай только его. Несколько вопросов подряд — запрещено.
- Внутренние теги из контекста — тип:fishing, тип:eco, ID123 — это служебные данные только для тебя. НИКОГДА не включай их в ответ пользователю.
- Не придумывай туры НА НАШЕЙ ПЛАТФОРМЕ, их цены и доступность — только то, что есть в данных ниже.
- Реальные места, объекты и достопримечательности Камчатки (санатории, базы, маршруты, горячие источники) — используй свои знания. Можешь рассказывать о Санатории Светлячок, Паратунке, Малкинских источниках и любых других реальных камчатских объектах.
- НОВОСТИ И СОБЫТИЯ: ты НЕ знаешь текущих новостей, если они не указаны в блоке "АКТУАЛЬНЫЕ НОВОСТИ" ниже. Если спрашивают про конкретное событие, которого нет в твоих данных — прямо скажи "у меня нет подтверждённой информации об этом". НИКОГДА не выдумывай события, ЧП, аварии или факты.
- Если данных недостаточно — прямо скажи это и предложи безопасный следующий шаг.
- Не дави на бронирование и не обещай гарантии, которых у тебя нет.
- Не предлагай бронирование первым. Только если человек сам спросит.
- Не говори, что уже "связался" или "договорился" с оператором, если это не сделано системой.
- Не обещай "мгновенное подтверждение" или "100% наличие мест".
- Не используй восклицательные знаки через каждое предложение.
- ССЫЛКИ: ты не можешь открывать ссылки. Но НИКОГДА не говори "не могу открывать ссылки". Вместо этого узнай домен (t.me = Telegram-канал, vk.com = ВК, youtube = видео и т.д.) и ответь по контексту. Пример: если прислали t.me/minec_tourism — скажи "Да, канал Минэкономразвития по туризму — полезный источник. Что оттуда хочешь обсудить?"
- ИНТЕРНЕТ: НИКОГДА не говори "я не могу выходить в интернет". Если тебя спрашивают про цены, режим работы, контакты какого-либо объекта — ты можешь найти актуальную информацию. Если данных нет прямо сейчас — скажи "сейчас уточню" или дай последние известные данные с оговоркой что лучше проверить на сайте.

ЕСЛИ ЧЕЛОВЕК ГОТОВ ОФОРМЛЯТЬ:
-> Коротко дай резюме: тур, цена-ориентир, что уточняется перед оплатой.
-> Если человек сам спросит про бронирование — объясни как оставить заявку.

КООРДИНАТЫ: если есть в блоке "МЕСТА ПО ЗАПРОСУ" — называй точные. Если нет — не придумывай. Скажи что точные координаты лучше проверить в Google Maps или 2GIS.

РАССТОЯНИЯ: от Петропавловска-Камчатского: Паратунка 60 км, Малкинские источники 200 км, Налычево 70 км, Мутновский вулкан 80 км, Авачинский вулкан 30 км от города, Толбачик 450 км, Курильское озеро 400 км. Не придумывай расстояния для мест которых нет в этом списке.

СЕЗОННЫЙ КАЛЕНДАРЬ КАМЧАТКИ:
- Январь–апрель: горные лыжи, снегоходы, сноуборд, зимняя рыбалка подо льдом
- Май–июнь: начало сезона, сход снега, первые медведи, рыбалка на форель
- Июль–август: пик сезона. Все маршруты открыты. Горбуша/кета. Медведи на реках. Температура +15..+22°C
- Сентябрь: лучший месяц для фотографии — осенние цвета + нерест нерки. Температура +8..+15°C
- Октябрь: конец сезона. Закрываются перевалы. Первый снег
- Рыбалка: горбуша июль–август, нерка июль–сентябрь, чавыча июнь–июль, кижуч август–октябрь, форель круглый год
- Вертолётные туры: июнь–сентябрь. Долина гейзеров закрыта зимой (снег)
- Медведи на реках: пик июль–сентябрь (нерест). Весной медведи голодные — осторожно на тропах

СМЕЖНЫЕ АКТИВНОСТИ — ПРОАКТИВНОСТЬ:
Когда человек спрашивает о конкретном месте, маршруте или активности — всегда задай один уточняющий вопрос о смежной активности, если она логична в этом месте:
- Место у реки, озера, залива → "Кстати, здесь хорошая рыбалка — интересует?"
- Маршрут в горах → упомяни горячие источники если есть рядом
- Вопрос только про рыбалку → "Помимо рыбалки что-то ещё интересует — трекинг, медведи, источники?"
- Спрашивают про конкретный вулкан → напомни про соседние объекты (если Мутновский — упомяни Дачные источники рядом; если Авачинский — упомяни что по пути смотровые на бухту)
- Вопрос про один день → уточни "Это однодневная вылазка или планируешь несколько дней?"
Цель: дать полную картину места, чтобы человек не пропустил главное из-за незнания. Не навязывай — именно задай вопрос. Один вопрос — строго (см. правило выше).

СТИЛЬ: спокойный, конкретный, коротко. Как опытный камчадал разговаривает с гостем — без суеты и без продаж. Без markdown-разметки (* ** # _).
ЯЗЫК: отвечай на языке собеседника. RU / EN / ZH / JA / KO / DE / FR / ES.`;


// ── Загрузка реальных туров из БД (контекст знаний) ─────────────────────────

interface TourContextRow {
  id: number;
  title: string;
  base_price: number;
  multi_day_count: number | null;
  activity_type: string | null;
  location_name: string | null;
  operator_name: string | null;
  available_slots: number | null;
  next_available_date: string | null;
}

let _tourContextCache: string = '';
let _tourContextAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 мин

// ── Bot Memory (TG / MAX — без регистрации, хранится в agent_memory) ─────────

export interface BotMemory {
  activities:     string[];
  locations:      string[];
  travel_style:   string | null;
  budget_level:   string | null;
  ai_notes:       string | null;
  messages_count: number;
}

function botMemKey(chatId: number, platform: 'tg' | 'max'): string {
  return `kuzmich_mem_${platform}_${chatId}`;
}

export async function loadBotMemory(chatId: number, platform: 'tg' | 'max'): Promise<BotMemory | null> {
  try {
    const { rows } = await pool.query<{ value: BotMemory }>(
      `SELECT value FROM agent_memory
       WHERE agent_id = 'kuzmich' AND memory_type = 'user_pref' AND key = $1 LIMIT 1`,
      [botMemKey(chatId, platform)],
    );
    return rows[0]?.value ?? null;
  } catch { return null; }
}

export async function saveBotMemory(
  chatId:   number,
  platform: 'tg' | 'max',
  patch:    Partial<BotMemory>,
  existing: BotMemory | null = null,
): Promise<void> {
  try {
    const cur = existing ?? await loadBotMemory(chatId, platform);
    const next: BotMemory = {
      // Merge arrays — новые интересы добавляются к старым
      activities:     [...new Set([...(cur?.activities ?? []), ...(patch.activities ?? [])])],
      locations:      [...new Set([...(cur?.locations  ?? []), ...(patch.locations  ?? [])])],
      travel_style:   patch.travel_style  !== undefined ? patch.travel_style  : (cur?.travel_style  ?? null),
      budget_level:   patch.budget_level  !== undefined ? patch.budget_level  : (cur?.budget_level  ?? null),
      ai_notes:       patch.ai_notes      !== undefined ? patch.ai_notes      : (cur?.ai_notes      ?? null),
      messages_count: (cur?.messages_count ?? 0) + (patch.messages_count ?? 0),
    };
    await pool.query(
      `INSERT INTO agent_memory
         (agent_id, memory_type, key, value, memory_tier, tags, created_at, updated_at, edit_count)
       VALUES ('kuzmich', 'user_pref', $1, $2::jsonb, 1, ARRAY['bot_memory'], NOW(), NOW(), 0)
       ON CONFLICT (agent_id, memory_type, key) DO UPDATE
         SET value = $2::jsonb, updated_at = NOW(),
             edit_count = agent_memory.edit_count + 1`,
      [botMemKey(chatId, platform), JSON.stringify(next)],
    );
  } catch (err) { console.error('[saveMsg]', err instanceof Error ? err.message : err); }
}

export function buildBotMemoryContext(mem: BotMemory): string {
  const parts: string[] = [];
  if (mem.messages_count > 4) {
    parts.push(`Уже общались (${mem.messages_count} сообщений).`);
  }
  if (mem.activities.length) {
    const L: Record<string, string> = {
      fishing: 'рыбалку', trekking: 'треккинг', volcano: 'вулканы',
      thermal: 'термальные источники', bears: 'медведей',
      helicopter: 'вертолётные туры', boat_trip: 'морские туры', snowmobile: 'снегоходы',
    };
    parts.push(`Интересуется: ${mem.activities.map(a => L[a] ?? a).join(', ')}.`);
  }
  if (mem.locations.length) parts.push(`Упоминаемые места: ${mem.locations.join(', ')}.`);
  if (mem.travel_style) {
    const S: Record<string, string> = {
      family: 'семейный отдых', solo: 'индивидуальный', adventure: 'экстрим', comfort: 'комфорт',
    };
    parts.push(`Стиль: ${S[mem.travel_style] ?? mem.travel_style}.`);
  }
  if (mem.budget_level) {
    const B: Record<string, string> = { budget: 'эконом', premium: 'премиум' };
    parts.push(`Бюджет: ${B[mem.budget_level] ?? mem.budget_level}.`);
  }
  if (mem.ai_notes) parts.push(mem.ai_notes);
  if (!parts.length) return '';
  return `\n\n[ПАМЯТЬ О ПОЛЬЗОВАТЕЛЕ]\n${parts.join(' ')}\nАдаптируй рекомендации. Не упоминай явно что "помнишь".`;
}

function extractBotMemoryPatch(text: string): Partial<BotMemory> {
  const lower = text.toLowerCase();
  const ACTIVITY_KW: Record<string, string> = {
    рыбал: 'fishing', рыб: 'fishing', fishing: 'fishing', лосось: 'fishing', нерка: 'fishing',
    трекк: 'trekking', поход: 'trekking', пеший: 'trekking', hiking: 'trekking',
    вулкан: 'volcano', volcano: 'volcano', кратер: 'volcano',
    термал: 'thermal', паратунк: 'thermal',
    медвед: 'bears', медведь: 'bears', bear: 'bears',
    вертолёт: 'helicopter', вертолет: 'helicopter', helicopter: 'helicopter',
    катер: 'boat_trip', яхт: 'boat_trip',
    снегоход: 'snowmobile',
  };
  const LOCATION_KW: Record<string, string> = {
    курильск: 'kurilskoye', мутновск: 'mutnovsky',
    авачинск: 'avachinsky', толбачик: 'tolbachik', налычево: 'nalychevo',
  };
  const activities = new Set<string>();
  const locations  = new Set<string>();
  for (const [kw, val] of Object.entries(ACTIVITY_KW)) {
    if (lower.includes(kw)) activities.add(val);
  }
  for (const [kw, val] of Object.entries(LOCATION_KW)) {
    if (lower.includes(kw)) locations.add(val);
  }
  let travel_style: string | null = null;
  if (/семь|дети|ребён|ребенок/.test(lower))       travel_style = 'family';
  else if (/\bодин\b|\bсама?\b|solo/.test(lower))  travel_style = 'solo';
  else if (/экстрим|adventure/.test(lower))         travel_style = 'adventure';
  else if (/комфорт|люкс|luxury/.test(lower))       travel_style = 'comfort';
  let budget_level: string | null = null;
  if (/бюджет|дёшево|эконом/.test(lower))           budget_level = 'budget';
  else if (/премиум|vip|дорог/.test(lower))         budget_level = 'premium';
  return {
    ...(activities.size ? { activities: [...activities] } : {}),
    ...(locations.size  ? { locations:  [...locations]  } : {}),
    ...(travel_style    ? { travel_style }                : {}),
    ...(budget_level    ? { budget_level }                : {}),
  };
}

async function synthesizeBotNotes(
  chatId:   number,
  platform: 'tg' | 'max',
  messages: Array<{ role: string; content: string }>,
  existing: string | null,
): Promise<void> {
  const userTurns = messages
    .filter(m => m.role === 'user')
    .slice(-12)
    .map(m => m.content)
    .join('\n');
  if (userTurns.length < 20) return;
  try {
    const { callAIFast } = await import('@/lib/ai/providers');
    const result = await callAIFast([{
      role: 'user',
      content: `Извлеки конкретные факты о туристе: даты поездки, размер группы, пожелания, ограничения, бюджет. Только факты одной строкой через точку с запятой. Если пользователь исправил что-то — используй НОВОЕ значение. Если ничего конкретного — ответь "нет".${existing ? `\n\nТекущие заметки (обнови если изменилось, иначе сохрани): ${existing}` : ''}\n\nСообщения туриста:\n${userTurns}`,
    }]);
    if (!result || /^нет\.?$/i.test(result.trim())) return;
    await saveBotMemory(chatId, platform, { ai_notes: result.trim().slice(0, 800) });
  } catch { /* fire-and-forget */ }
}

export async function buildTourContext(): Promise<string> {
  if (_tourContextCache && Date.now() - _tourContextAt < CACHE_TTL_MS) {
    return _tourContextCache;
  }
  try {
    const [toursResult, placesResult, knowledgeResult] = await Promise.all([
      pool.query<TourContextRow>(`
        SELECT ot.id, ot.title, ot.base_price, ot.multi_day_count, ot.activity_type,
               ot.location_name,
               ot.available_slots,
               ot.next_available_date::text,
               u.company_name AS operator_name
        FROM operator_tours ot
        LEFT JOIN users u ON u.id = ot.operator_id
        WHERE ot.is_active = true AND ot.deleted_at IS NULL
        ORDER BY ot.base_price ASC
        LIMIT 40
      `),
      pool.query<{ name: string; category: string; district: string | null; description: string | null }>(`
        SELECT name, category, district, LEFT(description, 120) AS description
        FROM places
        ORDER BY category, name
        LIMIT 100
      `),
      pool.query<{ title: string; compiled_truth: string }>(`
        SELECT title, LEFT(compiled_truth, 300) AS compiled_truth
        FROM agent_knowledge
        WHERE agent_id = 'kuzmich'
        ORDER BY updated_at DESC
        LIMIT 50
      `),
    ]);

    const { rows } = toursResult;
    if (!rows.length) return '';

    const lines = rows.map(r => {
      const dur   = r.multi_day_count ? `${r.multi_day_count} дн.` : '';
      const price = `от ${Number(r.base_price).toLocaleString('ru-RU')} р/чел`;
      const cat   = r.activity_type ? ` тип:${r.activity_type}` : '';
      const loc   = r.location_name ? ` — ${r.location_name}` : '';
      const op    = r.operator_name ? ` | Оп: ${r.operator_name}` : '';
      const slots = r.available_slots != null
        ? ` | Мест: ${r.available_slots > 0 ? r.available_slots : 'нет свободных'}`
        : '';
      const nextDate = r.next_available_date
        ? ` | Ближайшая дата: ${new Date(r.next_available_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
        : '';
      return `ID${r.id}: "${r.title}"${loc} ${cat} ${dur} ${price}${op}${slots}${nextDate}`;
    });

    // Places block
    const placesLines = placesResult.rows.map(p => {
      const dist = p.district ? ` (${p.district})` : '';
      const desc = p.description ? ` — ${p.description}` : '';
      return `${p.name}${dist}${desc}`;
    });

    // Agent knowledge block
    const knowledgeLines = knowledgeResult.rows.map(k => `${k.title}: ${k.compiled_truth}`);

    // Load live context: weather + news + MChS alerts
    const liveBlock = await loadLiveContext();

    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kamchatka' });
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kamchatka' });

    _tourContextCache = [
      `СЕГОДНЯ: ${dateStr}, ${timeStr} (Камчатка, UTC+12)`,
      '',
      'РЕАЛЬНЫЕ ТУРЫ НА ПЛАТФОРМЕ (актуальные цены, называй по имени):',
      ...lines,
      '',
      'Когда турист спрашивает о конкретном туре — дай факты. Не предлагай бронирование первым.',
      '',
      placesLines.length ? 'МЕСТА И ДОСТОПРИМЕЧАТЕЛЬНОСТИ КАМЧАТКИ (из базы платформы):' : '',
      ...placesLines,
      '',
      knowledgeLines.length ? 'БАЗА ЗНАНИЙ КУЗЬМИЧА (санатории, трансфер, FAQ):' : '',
      ...knowledgeLines,
      liveBlock,
    ].filter(Boolean).join('\n');
    _tourContextAt = Date.now();
    return _tourContextCache;
  } catch {
    return '';
  }
}

// ── Динамический поиск мест по запросу пользователя ─────────────────────────

interface PlaceRow {
  title: string;
  description: string | null;
  lat: string | null;
  lng: string | null;
  source_name: string | null;
}

export async function searchPlaceKnowledge(query: string): Promise<string> {
  if (!query || query.length < 3) return '';
  try {
    const ftsQuery = query
      .replace(/[^\wа-яёА-ЯЁ ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100);

    if (!ftsQuery) return '';

    // FTS через GIN-индексы — без фильтра is_visible (1127/1258 записей is_visible=false, но имеют координаты)
    // UNION: agent_route_knowledge (с координатами) + kamchatka_routes (описания с visitkamchatka.ru)
    const { rows } = await pool.query<PlaceRow>(
      `SELECT title, description, lat, lng, source_name
       FROM (
         (
           SELECT title, description, lat::text AS lat, lng::text AS lng, source_name,
                  ts_rank(to_tsvector('russian', search_text), plainto_tsquery('russian', $1)) AS rank
           FROM agent_route_knowledge
           WHERE to_tsvector('russian', search_text) @@ plainto_tsquery('russian', $1)
             AND lat IS NOT NULL AND lat != 0
           ORDER BY rank DESC
           LIMIT 6
         )
         UNION ALL
         (
           SELECT title, description, NULL::text AS lat, NULL::text AS lng, source_name,
                  ts_rank(to_tsvector('russian', title), plainto_tsquery('russian', $1)) AS rank
           FROM kamchatka_routes
           WHERE to_tsvector('russian', title) @@ plainto_tsquery('russian', $1)
             AND description IS NOT NULL
           ORDER BY rank DESC
           LIMIT 3
         )
       ) combined
       ORDER BY rank DESC
       LIMIT 8`,
      [ftsQuery],
    );

    // Fallback ILIKE для коротких/транслитерированных запросов без FTS-хитов
    let results = rows;
    if (!results.length) {
      const words = ftsQuery.split(/\s+/).filter(w => w.length > 3);
      if (words.length) {
        const conds = words.slice(0, 3).map((_, i) => `title ILIKE $${i + 1}`).join(' OR ');
        const params = words.slice(0, 3).map(w => `%${w}%`);
        const { rows: fb } = await pool.query<PlaceRow>(
          `SELECT title, description, lat::text AS lat, lng::text AS lng, source_name
           FROM agent_route_knowledge
           WHERE (${conds}) AND lat IS NOT NULL AND lat != 0
           ORDER BY updated_at DESC LIMIT 5`,
          params,
        );
        results = fb;
      }
    }

    if (!results.length) return '';

    // Дедупликация по заголовку (UNION может давать дубли)
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const r of results) {
      if (seen.has(r.title)) continue;
      seen.add(r.title);
      const coords = r.lat && r.lng && parseFloat(r.lat) !== 0
        ? ` | Координаты: ${parseFloat(r.lat).toFixed(6)}, ${parseFloat(r.lng).toFixed(6)}`
        : '';
      const desc = r.description ? ` — ${r.description.slice(0, 200)}` : '';
      lines.push(`- ${r.title}${coords}${desc}`);
      if (lines.length >= 6) break;
    }

    return `МЕСТА ПО ЗАПРОСУ (точные данные из базы):\n${lines.join('\n')}`;
  } catch { return ''; }
}

// ── Live Context: weather, news, MChS ────────────────────────────────────────

interface LiveCache { text: string; at: number }
const _weatherCache: LiveCache = { text: '', at: 0 };
const _newsCache: LiveCache = { text: '', at: 0 };
const _mchsCache: LiveCache = { text: '', at: 0 };

const WEATHER_TTL = 30 * 60 * 1000; // 30 min
const NEWS_TTL = 60 * 60 * 1000;    // 1 hour

/** Fetch weather for Petropavlovsk-Kamchatsky */
async function fetchWeather(): Promise<string> {
  if (_weatherCache.text && Date.now() - _weatherCache.at < WEATHER_TTL) return _weatherCache.text;
  try {
    const res = await fetch(
      'https://wttr.in/Petropavlovsk-Kamchatsky?format=j1&lang=ru',
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return '';
    const data = await res.json() as {
      current_condition: Array<{
        temp_C: string; FeelsLikeC: string; humidity: string;
        windspeedKmph: string; weatherDesc: Array<{ value: string }>;
        lang_ru?: Array<{ value: string }>;
      }>;
    };
    const c = data.current_condition[0];
    if (!c) return '';
    const desc = c.lang_ru?.[0]?.value ?? c.weatherDesc[0]?.value ?? '';
    const sign = (n: number) => n > 0 ? `+${n}` : String(n);
    const t = parseInt(c.temp_C);
    const f = parseInt(c.FeelsLikeC);
    _weatherCache.text = `Петропавловск-Камчатский: ${sign(t)}C (ощущается ${sign(f)}C), ${desc}, ветер ${c.windspeedKmph} км/ч, влажность ${c.humidity}%`;
    _weatherCache.at = Date.now();
    return _weatherCache.text;
  } catch { return ''; }
}

/** Lightweight RSS parser — extracts title + pubDate from first N items */
function parseRssHeadlines(xml: string, limit = 5): Array<{ title: string; date: string }> {
  const items: Array<{ title: string; date: string }> = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
    if (titleMatch?.[1]) {
      const rawDate = dateMatch?.[1] ?? '';
      const d = rawDate ? new Date(rawDate) : null;
      const fmtDate = d && !isNaN(d.getTime())
        ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        : '';
      items.push({ title: titleMatch[1].trim(), date: fmtDate });
    }
  }
  return items;
}

/** Fetch Kamchatka news headlines from RSS */
async function fetchKamchatkaNews(): Promise<string> {
  if (_newsCache.text && Date.now() - _newsCache.at < NEWS_TTL) return _newsCache.text;
  const feeds = [
    'https://kamchatka.aif.ru/rss/all.php',
    'https://www.kamgov.ru/news/rss',
  ];
  const headlines: Array<{ title: string; date: string }> = [];
  for (const url of feeds) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const xml = await res.text();
      headlines.push(...parseRssHeadlines(xml, 4));
    } catch { /* feed unavailable */ }
    if (headlines.length >= 6) break;
  }
  if (!headlines.length) { _newsCache.text = ''; _newsCache.at = Date.now(); return ''; }
  const lines = headlines.slice(0, 6).map(h => `- ${h.date ? h.date + ': ' : ''}${h.title}`);
  _newsCache.text = lines.join('\n');
  _newsCache.at = Date.now();
  return _newsCache.text;
}

/** Fetch MChS Kamchatka alerts (may be geo-blocked outside Russia) */
async function fetchMchsAlerts(): Promise<string> {
  if (_mchsCache.text && Date.now() - _mchsCache.at < NEWS_TTL) return _mchsCache.text;
  const feeds = [
    'https://41.mchs.gov.ru/deyatelnost/press-centr/novosti/rss',
    'https://www.mchs.gov.ru/rss',
  ];
  const items: Array<{ title: string; date: string }> = [];
  for (const url of feeds) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const xml = await res.text();
      items.push(...parseRssHeadlines(xml, 4));
      if (items.length >= 4) break;
    } catch { /* feed unavailable, likely geo-blocked */ }
  }
  if (!items.length) { _mchsCache.text = ''; _mchsCache.at = Date.now(); return ''; }
  const lines = items.slice(0, 5).map(h => `- ${h.date ? h.date + ': ' : ''}${h.title}`);
  _mchsCache.text = lines.join('\n');
  _mchsCache.at = Date.now();
  return _mchsCache.text;
}

/** Build full live context block */
async function loadLiveContext(): Promise<string> {
  const [weather, news, mchs, dbIntel, groupIntel] = await Promise.all([
    fetchWeather(),
    fetchKamchatkaNews(),
    fetchMchsAlerts(),
    loadDbIntel(),
    loadGroupIntel(),
  ]);

  const blocks: string[] = [];

  if (weather) {
    blocks.push(`ПОГОДА СЕЙЧАС:\n${weather}`);
  }

  if (mchs) {
    blocks.push(`МЧС КАМЧАТКА (последние сообщения):\n${mchs}`);
  }

  if (news) {
    blocks.push(`НОВОСТИ КАМЧАТКИ (свежие заголовки):\n${news}`);
  }

  if (groupIntel) {
    blocks.push(`РАЗВЕДКА ИЗ TG-ГРУПП (мониторинг каналов):\n${groupIntel}`);
  }

  if (dbIntel) {
    blocks.push(`АНАЛИТИКА (из мониторинга):\n${dbIntel}`);
  }

  if (!blocks.length) return '';
  return '\n' + blocks.join('\n\n');
}

/** Load recent travel/safety intel from agent_memory */
async function loadDbIntel(): Promise<string> {
  try {
    const { rows } = await pool.query<{ key: string; value: { summary: string; domain: string } }>(
      `SELECT key, value FROM agent_memory
       WHERE (key LIKE 'intel_travel%' OR key LIKE 'intel_competitors%')
         AND updated_at > NOW() - INTERVAL '3 days'
       ORDER BY updated_at DESC LIMIT 3`,
    );
    if (!rows.length) return '';
    return rows.map(r => `- ${r.value.summary?.slice(0, 300) ?? ''}`).join('\n');
  } catch { return ''; }
}

/** Load recent group/channel intelligence from agent_memory */
async function loadGroupIntel(): Promise<string> {
  try {
    const { rows } = await pool.query<{
      value: { group_title?: string; intel?: { key_insights?: string[]; hot_signals?: string[]; conditions?: string[] } };
    }>(
      `SELECT value FROM agent_memory
       WHERE agent_id = 'evo' AND key LIKE 'tg_group_intel_%'
         AND updated_at > NOW() - INTERVAL '2 days'
       ORDER BY updated_at DESC LIMIT 5`,
    );
    if (!rows.length) return '';
    const lines: string[] = [];
    for (const r of rows) {
      const v = r.value;
      const intel = v.intel;
      if (!intel) continue;
      const group = v.group_title ?? 'Группа';
      if (intel.hot_signals?.length) {
        lines.push(...intel.hot_signals.map(s => `- [${group}] ${s}`));
      }
      if (intel.key_insights?.length) {
        lines.push(...intel.key_insights.slice(0, 2).map(s => `- [${group}] ${s}`));
      }
      if (intel.conditions?.length) {
        lines.push(...intel.conditions.slice(0, 2).map(s => `- [${group}] ${s}`));
      }
    }
    return lines.slice(0, 10).join('\n');
  } catch { return ''; }
}

// ── Дата-парсер ───────────────────────────────────────────────────────────────

const MONTHS: Record<string, string> = {
  'января': '01', 'январе': '01', 'январь': '01',
  'февраля': '02', 'феврале': '02', 'февраль': '02',
  'марта': '03', 'марте': '03', 'март': '03',
  'апреля': '04', 'апреле': '04', 'апрель': '04',
  'мая': '05', 'мае': '05', 'май': '05',
  'июня': '06', 'июне': '06', 'июнь': '06',
  'июля': '07', 'июле': '07', 'июль': '07',
  'августа': '08', 'августе': '08', 'август': '08',
  'сентября': '09', 'сентябре': '09', 'сентябрь': '09',
  'октября': '10', 'октябре': '10', 'октябрь': '10',
  'ноября': '11', 'ноябре': '11', 'ноябрь': '11',
  'декабря': '12', 'декабре': '12', 'декабрь': '12',
};

export function parseDate(text: string): string | null {
  const t = text.toLowerCase().trim();

  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = t.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

  const dm = t.match(/(\d{1,2})[./](\d{1,2})/);
  if (dm) {
    const year = new Date().getFullYear();
    return `${year}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
  }

  const rus = t.match(/(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?/);
  if (rus) {
    const month = MONTHS[rus[2]];
    if (month) {
      const year = rus[3] ?? String(new Date().getFullYear());
      return `${year}-${month}-${rus[1].padStart(2, '0')}`;
    }
  }

  return null;
}

// ── Ключевые слова туров ──────────────────────────────────────────────────────

const TOUR_KEYWORDS_MAP: Record<string, string[]> = {
  'рыбалка': ['рыбалк', 'рыб', 'fishing', 'лосось', 'нерка', 'форел'],
  'вулкан': ['вулкан', 'volcano', 'кратер', 'авача', 'авачинск', 'мутновск'],
  'медведи': ['медвед', 'bear', 'курильское', 'косолапый'],
  'термальные': ['термал', 'горячие источники', 'купальн', 'паратунк', 'нарзан'],
  'вертолет': ['вертолет', 'вертолёт', 'helicopter', 'heli', 'helo'],
  'снегоход': ['снегоход', 'снег', 'snowmobile', 'зимн', 'лыж'],
  'катер': ['катер', 'море', 'лодк', 'boat', 'яхт', 'бухт'],
  'треккинг': ['треккинг', 'поход', 'пеший', 'trekking', 'hiking', 'маршрут'],
  'дайвинг': ['дайвинг', 'diving', 'подводн'],
  'сплав': ['сплав', 'рафтинг', 'river', 'рек'],
};
const TOUR_KEYWORD_KEYS = Object.keys(TOUR_KEYWORDS_MAP);

export function extractTourKeywords(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  for (const [key, triggers] of Object.entries(TOUR_KEYWORDS_MAP)) {
    if (triggers.some(tr => t.includes(tr))) found.push(key);
  }
  return found.length ? found : [text.slice(0, 30)];
}

// ── Триггеры ──────────────────────────────────────────────────────────────────

const BOOKING_TRIGGERS = [
  // явные намерения
  'бронирую', 'забронируй', 'бронируем', 'забронировать', 'хочу забронировать',
  'хочу записаться', 'хочу на этот', 'хочу этот', 'запишите', 'записывай',
  'оформи', 'оформляй', 'давай бронируем', 'бронировать',
  // короткие / разговорные
  'бронь', 'бронируй', 'запиши меня', 'записать меня', 'хочу тур',
  'оплатим', 'оплачу', 'хочу оплатить', 'давай оплатим',
  'беру', 'берём', 'возьму', 'возьмём',
  'работаем', 'договорились', 'подходит', 'нравится', 'go', 'ok давай',
  'book', 'reserve',
];

export function isBookingTrigger(text: string): boolean {
  const t = text.toLowerCase();
  return BOOKING_TRIGGERS.some(tr => t.includes(tr));
}

const YES = ['да', 'yes', 'верно', 'подтверждаю', 'всё верно', 'ок', 'ok', 'го', 'давай', 'подтвердить'];
const NO = ['нет', 'no', 'не верно', 'отмена', 'cancel', 'стоп', 'stop', 'отменить', 'назад'];

export function isYes(t: string) { return YES.some(y => t.toLowerCase().includes(y)); }
export function isNo(t: string)  { return NO.some(n => t.toLowerCase().includes(n)); }

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function getHistory(chatId: number, mode: string): Promise<ChatMessage[]> {
  try {
    const { rows } = await pool.query<{ role: string; content: string }>(
      `SELECT role, content FROM tg_conversations
       WHERE chat_id = $1 AND mode = $2
       ORDER BY created_at DESC LIMIT 20`,
      [chatId, mode],
    );
    return rows.reverse() as ChatMessage[];
  } catch { return []; }
}

export async function saveMsg(
  chatId: number, mode: string, role: 'user' | 'assistant', content: string,
  userId?: number | null, userName?: string | null,
) {
  try {
    await pool.query(
      `INSERT INTO tg_conversations (chat_id, mode, role, content, user_id, user_name, platform)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [chatId, mode, role, content, userId ?? null, userName ?? null, mode === 'max' ? 'max' : 'telegram'],
    );
  } catch { /* не блокируем */ }
}

export async function findTour(keywords: string[]): Promise<TourRow | null> {
  try {
    const patterns = keywords.map(k => `%${k}%`);
    const matchClauses = patterns.map((_, i) =>
      `(CASE WHEN title ILIKE $${i + 1} THEN 1 ELSE 0 END + CASE WHEN activity_type ILIKE $${i + 1} THEN 1 ELSE 0 END)`
    );
    const relevanceExpr = matchClauses.join(' + ');
    const whereClause = patterns.map((_, i) =>
      `(title ILIKE $${i + 1} OR activity_type ILIKE $${i + 1})`
    ).join(' OR ');

    const { rows } = await pool.query<TourRow>(
      `SELECT id, title, base_price, multi_day_count, activity_type
       FROM operator_tours
       WHERE is_active = true AND deleted_at IS NULL
         AND (${whereClause})
       ORDER BY (${relevanceExpr}) DESC, base_price ASC LIMIT 1`,
      patterns,
    );
    return rows[0] ?? null;
  } catch { return null; }
}

export class BookingError extends Error {
  constructor(message: string, public readonly code: 'NO_SLOTS' | 'NOT_FOUND' | 'DB_ERROR') {
    super(message);
    this.name = 'BookingError';
  }
}

export async function createBooking(
  b: Required<Omit<PendingBooking, 'step' | 'started_at'>>,
  createdVia: string,
  tgChatId?: number,
  platform?: 'tg' | 'max',
): Promise<number | null> {
  const total = b.tour.base_price * b.participants;
  const meta = (tgChatId != null)
    ? JSON.stringify({ tg_chat_id: tgChatId, platform: platform ?? 'tg' })
    : null;

  let bookingId: number | null = null;

  try {
    bookingId = await transaction(async (client) => {
      // Lock the tour row — serialises concurrent booking attempts.
      const tourLockResult = await client.query<{ max_participants: number | null }>(
        `SELECT max_participants
         FROM operator_tours
         WHERE id = $1 AND is_active = true AND is_published = true AND deleted_at IS NULL
         FOR UPDATE`,
        [b.tour.id],
      );
      if (tourLockResult.rows.length === 0) {
        throw new BookingError('Тур больше недоступен. Свяжитесь с оператором.', 'NOT_FOUND');
      }
      const maxParticipants = tourLockResult.rows[0]!.max_participants;

      // Count confirmed bookings on the requested date.
      // The FOR UPDATE above ensures this read is consistent under concurrency.
      if (maxParticipants != null) {
        const slotResult = await client.query<{ already_booked: string }>(
          `SELECT COALESCE(SUM(participants), 0) AS already_booked
           FROM operator_bookings
           WHERE operator_tour_id = $1
             AND booking_date = $2
             AND booking_status NOT IN ('cancelled', 'rejected')`,
          [b.tour.id, b.date],
        );
        const alreadyBooked = parseInt(slotResult.rows[0]!.already_booked, 10);
        if (alreadyBooked + b.participants > maxParticipants) {
          const remaining = maxParticipants - alreadyBooked;
          throw new BookingError(
            remaining <= 0
              ? 'На эту дату нет свободных мест. Выберите другую дату.'
              : `Доступно только ${remaining} мест на эту дату, запрашивается ${b.participants}.`,
            'NO_SLOTS',
          );
        }
      }

      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO operator_bookings
           (operator_tour_id, tourist_name, tourist_phone,
            participants, booking_date, booking_status,
            base_total_price, final_price, created_via, metadata)
         VALUES ($1,$2,$3,$4,$5,'pending_payment',$6,$6,$7,$8::jsonb)
         RETURNING id`,
        [b.tour.id, b.name, b.phone, b.participants, b.date, total, createdVia, meta],
      );
      return rows[0]?.id ?? null;
    });
  } catch (err) {
    // Surface diagnostic info to logs — silent failure made debugging impossible
    if (err instanceof BookingError) {
      console.warn(`[kuzmich:createBooking] ${err.code}: ${err.message} (tour=${b.tour.id} date=${b.date} participants=${b.participants})`);
      throw err; // bubble up — caller renders the message to user
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[kuzmich:createBooking] DB error:', msg, { tourId: b.tour.id, date: b.date });
    return null;
  }

  // Fire-and-forget side effects — outside transaction by design (failure must not affect booking)
  if (bookingId) {
    void notifyOperatorNewBooking(bookingId, b, total);
    void recordBookingPatternInBrain(bookingId, b, total, platform);
  }

  return bookingId;
}

async function recordBookingPatternInBrain(
  bookingId: number,
  b: Required<Omit<PendingBooking, 'step' | 'started_at'>>,
  total: number,
  platform?: 'tg' | 'max',
): Promise<void> {
  try {
    const slug = `patterns/kuzmich/tour-${b.tour.id}`;
    const dateStr = b.date
      ? new Date(b.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      : 'дата не указана';

    // Гарантируем что страница паттерна существует
    await knowledgeBase.upsert({
      slug,
      type: 'pattern',
      title: `Booking pattern: ${b.tour.title}`,
      compiled_truth: `Тур "${b.tour.title}" бронируется через Kuzmich. Цена: ${b.tour.base_price} ₽/чел.`,
      metadata: { tour_id: b.tour.id, base_price: b.tour.base_price },
      agent_id: 'kuzmich',
    });

    // Добавляем запись о конкретном бронировании
    const entry = `booking #${bookingId}: ${b.participants} чел, ${dateStr}, ${total.toLocaleString('ru-RU')} ₽, канал=${platform ?? 'web'}`;
    await knowledgeBase.appendTimeline(slug, entry);
  } catch { /* fire-and-forget, не блокируем бронирование */ }
}

async function notifyOperatorNewBooking(
  bookingId: number,
  b: Required<Omit<PendingBooking, 'step' | 'started_at'>>,
  total: number,
): Promise<void> {
  try {
    // Получаем telegram_id оператора
    const { rows } = await pool.query<{ telegram_id: string | null }>(
      `SELECT u.telegram_id
       FROM operator_tours ot
       JOIN users u ON u.id = ot.operator_id
       WHERE ot.id = $1 LIMIT 1`,
      [b.tour.id],
    );
    const operatorTgId = rows[0]?.telegram_id;

    // Всегда уведомляем владельца платформы
    const ownerTgId = process.env.TELEGRAM_OWNER_ID;
    const targets = new Set<string>();
    if (operatorTgId) targets.add(operatorTgId);
    if (ownerTgId)    targets.add(ownerTgId);
    if (targets.size === 0) return;

    const botToken = process.env.TELEGRAM_KUZMICH_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN ?? '';
    if (!botToken) return;

    const dateStr = b.date
      ? new Date(b.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'не указана';
    const priceStr = total.toLocaleString('ru-RU') + ' ₽';
    const payLink  = `https://tourhab.ru/booking-success/${bookingId}`;

    const text = [
      `<b>Новое бронирование #${bookingId}</b>`,
      '',
      `Тур: ${b.tour.title}`,
      `Дата: ${dateStr}`,
      `Человек: ${b.participants}`,
      `Сумма: ${priceStr}`,
      '',
      `Турист: ${b.name}`,
      `Телефон: ${b.phone}`,
      '',
      `<a href="${payLink}">Открыть бронирование</a>`,
    ].join('\n');

    const body = JSON.stringify({
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[
          { text: 'Связаться с туристом', url: `tel:${b.phone}` },
        ]],
      },
    });

    for (const chatId of targets) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, ...JSON.parse(body) }),
      }).catch(() => {});
    }
  } catch { /* не блокируем */ }
}

// ── Cleanup для pending Maps ──────────────────────────────────────────────────

export function cleanupPending(pending: Map<number, PendingBooking>) {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of pending) {
    if (v.started_at < cutoff) pending.delete(k);
  }
}

// ── Персистентное состояние бронирования (migration 137) ─────────────────────
// Дублирует in-memory Map в БД → выживает при перезапуске контейнера

export async function loadBookingFlow(
  chatId: number,
  mode: string,
  pending: Map<number, PendingBooking>,
): Promise<PendingBooking | null> {
  // Сначала in-memory (быстро)
  const mem = pending.get(chatId);
  if (mem) return mem;

  // Потом DB (на случай перезапуска)
  try {
    const { rows } = await pool.query<{ state: PendingBooking }>(
      `SELECT state FROM tg_booking_flow WHERE chat_id = $1 AND mode = $2 LIMIT 1`,
      [chatId, mode],
    );
    if (rows[0]?.state) {
      const b = rows[0].state;
      b.started_at = b.started_at ?? Date.now(); // backward compat
      pending.set(chatId, b); // восстанавливаем в памяти
      return b;
    }
  } catch { /* таблица ещё не создана — не критично */ }
  return null;
}

export async function saveBookingFlow(
  chatId: number,
  mode: string,
  booking: PendingBooking,
  pending: Map<number, PendingBooking>,
): Promise<void> {
  pending.set(chatId, booking); // in-memory
  try {
    await pool.query(
      `INSERT INTO tg_booking_flow (chat_id, mode, state, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (chat_id, mode) DO UPDATE
         SET state = $3::jsonb, updated_at = NOW()`,
      [chatId, mode, JSON.stringify(booking)],
    );
  } catch { /* не критично */ }
}

export async function deleteBookingFlow(
  chatId: number,
  mode: string,
  pending: Map<number, PendingBooking>,
): Promise<void> {
  pending.delete(chatId);
  try {
    await pool.query(
      `DELETE FROM tg_booking_flow WHERE chat_id = $1 AND mode = $2`,
      [chatId, mode],
    );
  } catch { /* не критично */ }
}

// ── Booking Step Handler ──────────────────────────────────────────────────────

export async function handleBookingStep(
  chatId: number,
  text: string,
  mode: string,
  pending: Map<number, PendingBooking>,
  reply: ReplyFn,
  createdVia: string,
): Promise<boolean> {
  // Загружаем из памяти ИЛИ из БД (выживает при перезапуске)
  const b = await loadBookingFlow(chatId, mode, pending);
  if (!b) return false;

  const t = text.trim();

  // Выход из booking flow по ключевым словам
  if (isNo(t) || /^\//.test(t)) {
    await deleteBookingFlow(chatId, mode, pending);
    await reply(chatId, 'Бронирование отменено. Чем могу помочь?');
    return true;
  }

  // Шаг 'tour': ищем тур по тому что написал пользователь
  if (b.step === 'tour') {
    const keywords = extractTourKeywords(t);
    // Если нет реальных ключевых слов — выходим из flow в AI
    const hasTourKeywords = TOUR_KEYWORD_KEYS.some(key => {
      const triggers = TOUR_KEYWORDS_MAP[key];
      return triggers.some(tr => t.toLowerCase().includes(tr));
    });
    if (!hasTourKeywords) {
      await deleteBookingFlow(chatId, mode, pending);
      return false; // → processMessage отдаст в aiChat
    }
    // Вопросы, советы, опасные темы — не бронируем, отдаём в AI
    const lowerT = t.toLowerCase();
    const isQuestion = lowerT.includes('?') || /^(что|как|зачем|почему|когда|можно ли|а если)\b/.test(lowerT);
    const isDangerous = /(спрыгн|упа[дс]|погиб|умер|опасн|безопасн|риск|страшн|жерло|лавин|шторм)/i.test(t);
    if (isQuestion || isDangerous) {
      await deleteBookingFlow(chatId, mode, pending);
      return false; // → AI ответит про безопасность
    }
    const tour = await findTour(keywords);
    if (!tour) {
      await reply(chatId, 'Не нашёл подходящий тур по этому запросу. Уточни: рыбалка, вулканы, медведи, термальные источники, вертолёт...');
      return true;
    }
    b.tour  = tour;
    b.step  = 'name';
    await saveBookingFlow(chatId, mode, b, pending);
    await reply(chatId, [
      `Бронируем <b>${tour.title}</b>`,
      `Стоимость от <b>${tour.base_price.toLocaleString('ru-RU')} р.</b> с человека.`,
      '',
      'Как вас зовут? (полное имя для брони)',
    ].join('\n'));
    return true;
  }

  if (b.step === 'name') {
    // Имя: 2-40 символов, только буквы/пробелы/дефис, 1-3 слова (имя [отчество] фамилия)
    const wordCount = t.trim().split(/\s+/).length;
    const looksLikeName = /^[\p{L}\s\-'.]+$/u.test(t) && !t.includes('?') && !t.includes('!') && !/\d/.test(t);
    if (!looksLikeName || t.length < 2 || t.length > 50 || wordCount > 3) {
      // Слишком длинная фраза или не похоже на имя — выходим в AI
      if (t.includes('?') || t.length > 50 || wordCount > 3) {
        await deleteBookingFlow(chatId, mode, pending);
        return false; // → processMessage отдаст в aiChat
      }
      await reply(chatId, 'Укажите имя и фамилию (только буквы). Или напишите "отмена" для выхода.');
      return true;
    }
    b.name = t;
    b.step = 'date';
    await saveBookingFlow(chatId, mode, b, pending);
    await reply(chatId, `Отлично, ${b.name}! На какую дату бронируем?\n\nПример: <b>15 июля</b> или <b>2026-07-15</b>`);
    return true;
  }

  if (b.step === 'date') {
    const date = parseDate(t);
    if (!date) {
      await reply(chatId, 'Не распознал дату. Напишите, например: <b>15 июля</b> или <b>2026-07-15</b>');
      return true;
    }
    const d = new Date(date);
    if (d < new Date()) {
      await reply(chatId, 'Дата уже прошла. Укажите будущую дату.');
      return true;
    }
    b.date = date;
    b.step = 'participants';
    await saveBookingFlow(chatId, mode, b, pending);
    await reply(chatId, 'Сколько человек едет?');
    return true;
  }

  if (b.step === 'participants') {
    const n = parseInt(t.replace(/[^\d]/g, ''), 10);
    if (!n || n < 1 || n > 50) {
      await reply(chatId, 'Укажите количество человек (от 1 до 50).');
      return true;
    }
    b.participants = n;
    b.step = 'phone';
    await saveBookingFlow(chatId, mode, b, pending);
    await reply(chatId, 'Ваш номер телефона для связи?\n\nПример: <b>+7 900 000-00-00</b>');
    return true;
  }

  if (b.step === 'phone') {
    const phone = t.replace(/[\s\-()]/g, '');
    const digitCount = (phone.match(/\d/g) ?? []).length;
    // Must be phone-like: mostly digits, starts with + or digit, 10-15 chars
    if (digitCount < 10 || !/^[+\d]/.test(phone) || phone.length > 20) {
      await reply(chatId, 'Укажите полный номер телефона, например: <b>+7 900 000-00-00</b>');
      return true;
    }
    b.phone = phone;
    b.step = 'confirm';
    await saveBookingFlow(chatId, mode, b, pending);

    const dateStr = new Date(b.date!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const total = (b.tour!.base_price * b.participants!).toLocaleString('ru-RU');

    await reply(chatId, [
      '<b>Проверьте данные брони:</b>',
      '',
      `Тур: <b>${b.tour!.title}</b>`,
      `Дата: <b>${dateStr}</b>`,
      `Человек: <b>${b.participants}</b>`,
      `Сумма: <b>${total} р.</b>`,
      `Имя: <b>${b.name}</b>`,
      `Телефон: <b>${b.phone}</b>`,
      '',
      'Всё верно? Напишите <b>Да</b> для подтверждения или <b>Нет</b> для отмены.',
    ].join('\n'));
    return true;
  }

  if (b.step === 'confirm') {
    if (isNo(t)) {
      await deleteBookingFlow(chatId, mode, pending);
      await reply(chatId, 'Бронирование отменено. Если что — пиши, помогу.');
      return true;
    }
    if (!isYes(t)) {
      await reply(chatId, 'Напишите <b>Да</b> для подтверждения или <b>Нет</b> для отмены.');
      return true;
    }

    let bookingId: number | null = null;
    try {
      bookingId = await createBooking(
        b as Required<Omit<PendingBooking, 'step' | 'started_at'>>,
        createdVia,
        chatId,
        createdVia.includes('max') ? 'max' : 'tg',
      );
    } catch (err) {
      // Capacity conflict or tour gone — surface specific reason to user
      if (err instanceof BookingError) {
        await deleteBookingFlow(chatId, mode, pending);
        await reply(chatId, err.message);
        return true;
      }
      throw err;
    }
    await deleteBookingFlow(chatId, mode, pending);

    if (!bookingId) {
      await reply(chatId, 'Не удалось создать бронирование. Попробуйте позже или позвоните оператору напрямую.');
      return true;
    }

    const dateStr = new Date(b.date!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const totalStr = (b.tour!.base_price * b.participants!).toLocaleString('ru-RU');
    const payLink  = `https://tourhab.ru/booking-success/${bookingId}`;
    await reply(chatId, [
      `Бронирование принято! Номер: <b>#${bookingId}</b>`,
      '',
      `Тур: ${b.tour!.title}`,
      `Дата: ${dateStr}`,
      `Человек: ${b.participants}`,
      `Сумма: <b>${totalStr} р.</b>`,
      '',
      `Для оплаты перейдите по ссылке:`,
      `<a href="${payLink}">${payLink}</a>`,
    ].join('\n'));
    return true;
  }

  return false;
}

// ── Start Booking ─────────────────────────────────────────────────────────────

export async function startBooking(
  chatId: number,
  text: string,
  mode: string,
  history: ChatMessage[],
  pending: Map<number, PendingBooking>,
  reply: ReplyFn,
): Promise<boolean> {
  const userMsgs = history.filter(m => m.role === 'user');

  // 1) Narrow: последнее сообщение пользователя (до триггера бронирования)
  const lastRealMsg = userMsgs[userMsgs.length - 1]?.content ?? '';
  const narrowKeywords = extractTourKeywords(lastRealMsg);
  let tour = narrowKeywords.length ? await findTour(narrowKeywords) : null;

  // 2) Fallback: расширяем на последние 3 user + последний AI
  if (!tour) {
    const lastUserMsg = userMsgs.slice(-3).map(m => m.content).join(' ');
    const lastAiMsg = history.filter(m => m.role === 'assistant').slice(-1)[0]?.content ?? '';
    const context = `${text} ${lastUserMsg} ${lastAiMsg}`;
    const keywords = extractTourKeywords(context);
    tour = await findTour(keywords);
  }
  if (!tour) {
    const booking: PendingBooking = { step: 'tour', started_at: Date.now() };
    await saveBookingFlow(chatId, mode, booking, pending);
    await reply(chatId, 'Какой тур интересует?\n\nНапиши: рыбалка, вулканы, медведи, термальные источники, вертолёт...');
    return true;
  }

  const booking: PendingBooking = { tour, step: 'name', started_at: Date.now() };
  await saveBookingFlow(chatId, mode, booking, pending);

  await reply(chatId, [
    `Бронируем <b>${tour.title}</b>`,
    `Стоимость от <b>${tour.base_price.toLocaleString('ru-RU')} р.</b> с человека.`,
    '',
    'Как вас зовут? (полное имя для брони)',
  ].join('\n'));
  return true;
}

// ── Web search fallback (Tavily → Brave) ────────────────────────────────────

const UNKNOWING_PHRASES = [
  'нет информации', 'не знаю', 'не знакома', 'не знаком',
  'не располагаю', 'нет данных', 'у меня нет', 'отсутствует информация',
  'не могу помочь', 'нет в моей базе', 'не знаком с',
  "i don't know", "i don't have", 'no information',
];

function looksUnknowing(text: string): boolean {
  const t = text.toLowerCase();
  return UNKNOWING_PHRASES.some(p => t.includes(p));
}

async function searchWeb(query: string): Promise<string> {
  const q = query.length > 200 ? query.slice(0, 200) : query;
  const searchQ = /камчатк/i.test(q) ? q : `${q} Камчатка`;

  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query: searchQ, search_depth: 'basic', max_results: 3 }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json() as { results?: Array<{ title: string; content: string }> };
        const snippets = (data.results ?? []).map(r => `${r.title}: ${r.content.slice(0, 300)}`);
        if (snippets.length > 0) return snippets.join('\n\n');
      }
    } catch { /* fallback to brave */ }
  }

  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  if (braveKey) {
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQ)}&count=3&country=ru`;
      const res = await fetch(url, {
        headers: { 'X-Subscription-Token': braveKey },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json() as { web?: { results?: Array<{ title: string; description: string }> } };
        const snippets = (data.web?.results ?? []).map(r => `${r.title}: ${r.description}`);
        if (snippets.length > 0) return snippets.join('\n\n');
      }
    } catch { /* no search available */ }
  }

  return '';
}

// ── AI Chat с знаниями из БД ──────────────────────────────────────────────────

// ── Level 1: Preemptive search triggers ─────────────────────────────────────

const PREEMPTIVE_PATTERNS = [
  /цен[аыу]/i, /стоимост/i, /сколько стоит/i, /почём/i,
  /телефон/i, /контакт/i, /позвонить/i,
  /режим работ/i, /часы работ/i, /когда открыт/i, /закрыт/i,
  /адрес/i, /как добраться/i, /как попасть/i, /как доехать/i,
  /забронировать/i, /билет/i,
];

function needsPreemptiveSearch(text: string): boolean {
  return PREEMPTIVE_PATTERNS.some(p => p.test(text));
}

async function saveSearchResultToKB(query: string, result: string): Promise<void> {
  const slug = `auto_${query.toLowerCase()
    .replace(/[^a-zа-яё0-9]/gi, '_')
    .replace(/_+/g, '_')
    .slice(0, 50)}_${Date.now() % 100000}`;
  await pool.query(
    `INSERT INTO agent_knowledge(slug,type,title,compiled_truth,agent_id,edit_count,created_at,updated_at)
     VALUES($1,'search_result',$2,$3,'kuzmich',0,NOW(),NOW())
     ON CONFLICT(slug) DO NOTHING`,
    [slug, query.slice(0, 100), `${result.slice(0, 500)}\n[Веб-поиск, ${new Date().toLocaleDateString('ru-RU')}]`],
  ).catch(() => {});
}

// ── Level 2: Tool use ────────────────────────────────────────────────────────

const KUZMICH_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_kamchatka',
      description: 'Поиск актуальной информации о Камчатке: цены, адреса, телефоны, расписание, отзывы. Используй ВСЕГДА когда не знаешь точных цифр или деталей.',
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'Поисковый запрос' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tours',
      description: 'Получить активные туры из платформы TourHab с ценами и датами. Используй когда турист спрашивает о конкретных турах или программах.',
      parameters: { type: 'object', properties: { activity_type: { type: 'string', description: 'Фильтр по типу: рыбалка, вулканы, медведи, гейзеры, трекинг и т.д.' } }, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_guardian_context',
      description: 'Получить полный контекст места как Хранитель: статус (открыто/закрыто), реалтайм алерты КБГС РАН, опасности, загрузка, традиционные знания о месте. Используй ВСЕГДА когда спрашивают о конкретном месте, вулкане, озере, маршруте, источнике Камчатки.',
      parameters: { type: 'object', properties: { place: { type: 'string', description: 'Название места или объекта' } }, required: ['place'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_place_info',
      description: 'Найти базовую информацию о месте из базы данных (используй get_guardian_context для полного контекста с безопасностью и алертами).',
      parameters: { type: 'object', properties: { name: { type: 'string', description: 'Название объекта' } }, required: ['name'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Получить текущую погоду в Петропавловске-Камчатском.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_taaft',
      description: 'Найти внешний AI-инструмент или онлайн-сервис для специфической задачи: определить растение или животное по фото, транскрибировать аудио, обработать GPX-трек, перевести текст, создать аудиогид, проверить лавинную обстановку. Используй когда нужен специализированный инструмент за пределами TourHab.',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Что нужно сделать (на русском): например "определить растение на фото", "транскрибировать аудиозапись", "анализировать GPX-трек"' },
        },
        required: ['task'],
      },
    },
  },
];

type ToolMsg =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string };

async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  try {
    if (name === 'search_kamchatka') {
      const result = await searchWeb(args.query ?? '');
      return result || 'Поиск не дал результатов.';
    }
    if (name === 'get_tours') {
      const ctx = await buildTourContext();
      return ctx || 'Туры не найдены.';
    }
    if (name === 'get_place_info') {
      const placeName = args.name ?? '';
      const [pr, kr] = await Promise.all([
        pool.query<{ name: string; description: string | null; category: string; district: string | null }>(
          `SELECT name, description, category, district FROM places WHERE name ILIKE $1 LIMIT 3`,
          [`%${placeName}%`],
        ),
        pool.query<{ title: string; compiled_truth: string }>(
          `SELECT title, compiled_truth FROM agent_knowledge WHERE agent_id='kuzmich' AND (title ILIKE $1 OR compiled_truth ILIKE $1) LIMIT 3`,
          [`%${placeName}%`],
        ),
      ]);
      const lines = [
        ...pr.rows.map(p => `${p.name} [${p.category}]${p.district ? ` (${p.district})` : ''}${p.description ? ': ' + p.description : ''}`),
        ...kr.rows.map(k => `${k.title}: ${k.compiled_truth}`),
      ];
      if (lines.length > 0) return lines.join('\n\n');
      return await searchWeb(placeName) || `Информация о "${placeName}" не найдена в базе.`;
    }
    if (name === 'get_guardian_context') {
      const { getGuardianContext } = await import('@/lib/kuzmich/guardian-context');
      const ctx = await getGuardianContext(args.place ?? args.name ?? '');
      return ctx || 'Данные о месте не найдены в системе. Попробую поискать через другие источники.';
    }
    if (name === 'get_weather') {
      return (await fetchWeather()) || 'Погода временно недоступна.';
    }
    if (name === 'search_taaft') {
      const { searchExternalTools, trackToolUsage, formatToolsForKuzmich } = await import('@/lib/agents/tools/taaft-search');
      const tools = await searchExternalTools(args.task ?? args.query ?? '');
      void Promise.all(tools.slice(0, 2).map((t) => trackToolUsage(t.slug)));
      return formatToolsForKuzmich(tools);
    }
    return 'Неизвестный инструмент.';
  } catch {
    return 'Ошибка при выполнении запроса.';
  }
}

async function aiChatAgentLoop(
  userText: string,
  systemContent: string,
  history: ChatMessage[],
  extraUserMsg: ChatMessage[],
): Promise<string | null> {
  const msgs: ToolMsg[] = [
    { role: 'system', content: systemContent },
    ...history.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content } as ToolMsg)),
    ...extraUserMsg.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content } as ToolMsg)),
  ];

  for (let turn = 0; turn < 4; turn++) {
    const result = await callOpenRouterWithTools(msgs, KUZMICH_TOOLS);
    if (!result) return null;

    if (!result.tool_calls?.length) {
      return result.content; // final answer
    }

    msgs.push({ role: 'assistant', content: result.content, tool_calls: result.tool_calls });

    for (const tc of result.tool_calls) {
      let args: Record<string, string> = {};
      try { args = JSON.parse(tc.function.arguments) as Record<string, string>; } catch { /* empty args */ }
      const toolResult = await executeTool(tc.function.name, args);
      msgs.push({ role: 'tool', content: toolResult, tool_call_id: tc.id });

      // Auto-save search results to KB for future use
      if (tc.function.name === 'search_kamchatka' && toolResult !== 'Поиск не дал результатов.') {
        void saveSearchResultToKB(args.query ?? userText, toolResult);
      }
    }
  }

  return null; // max turns exceeded
}

export async function aiChat(opts: {
  chatId: number;
  text: string;
  mode: string;
  reply: ReplyFn;
  userId?: number | null;
  userName?: string | null;
  visionDescription?: string;
  pending: Map<number, PendingBooking>;
  platform?: 'tg' | 'max';
  afterReply?: (chatId: number, answer?: string) => Promise<void>;
}): Promise<void> {
  const { chatId, text, mode, reply, userId, userName, visionDescription, platform, afterReply } = opts;

  // Сохраняем сообщение пользователя
  const userContent = visionDescription
    ? `[Фото: ${visionDescription}]\n${text || ''}`.trim()
    : text;
  await saveMsg(chatId, mode, 'user', userContent, userId, userName);

  const [history, tourContext, botMemory, placeCtx] = await Promise.all([
    getHistory(chatId, mode),
    buildTourContext(),
    platform ? loadBotMemory(chatId, platform) : Promise.resolve(null),
    searchPlaceKnowledge(text),
  ]);

  // Строим системный промпт с маркером для prompt caching:
  // — выше маркера: статика (KUZMICH_SYSTEM + tourContext) — кешируется (TTL 5 мин)
  // — ниже маркера: динамика (placeCtx меняется по запросу, memCtx по юзеру) — без кеша
  const memCtx = botMemory ? buildBotMemoryContext(botMemory) : '';
  const cacheable = [KUZMICH_SYSTEM, tourContext || ''].filter(Boolean).join('\n\n');
  const dynamic = [placeCtx || '', memCtx || ''].filter(Boolean).join('\n\n');
  const systemContent = dynamic
    ? `${cacheable}\n\n${CACHE_BREAK_MARKER}\n\n${dynamic}`
    : cacheable;

  // Если есть описание фото — прокидываем его первым сообщением
  const extraUserMsg: ChatMessage[] = visionDescription
    ? [{ role: 'user', content: `Пользователь прислал фото. Вот что на нём: ${visionDescription}` }]
    : [];

  // ── Level 2: Agent loop with tools (primary path) ────────────────────────
  let answer = await aiChatAgentLoop(userContent, systemContent, history, extraUserMsg)
    .then(r => (r?.trim() ? cleanAIResponse(r.trim()) : ''))
    .catch(() => '');

  // ── Fallback: waterfall without tools ───────────────────────────────────
  if (!answer) {
    // Level 1: preemptive search for price/contact/schedule queries
    let enrichedSystem = systemContent;
    if (needsPreemptiveSearch(userContent)) {
      const preSearch = await searchWeb(userContent);
      if (preSearch) enrichedSystem += `\n\nАКТУАЛЬНЫЕ ДАННЫЕ ИЗ ПОИСКА:\n${preSearch}`;
    }

    const fallbackMessages: ChatMessage[] = [
      { role: 'system', content: enrichedSystem },
      ...history,
      ...extraUserMsg,
    ];

    const response = await callAIWaterfall(fallbackMessages);
    answer = response?.trim() ? cleanAIResponse(response.trim()) : 'Что-то с сигналом... Попробуй ещё раз.';

    // Level 1: reactive fallback if waterfall still doesn't know
    if (looksUnknowing(answer)) {
      const searchResults = await searchWeb(userContent);
      if (searchResults) {
        void saveSearchResultToKB(userContent, searchResults);
        const retryMessages: ChatMessage[] = [
          { role: 'system', content: systemContent + `\n\nРЕЗУЛЬТАТЫ ПОИСКА:\n${searchResults}\n\nОтветь на основе этих данных кратко и точно.` },
          ...history,
          ...extraUserMsg,
        ];
        const retry = await callAIWaterfall(retryMessages);
        if (retry?.trim()) answer = cleanAIResponse(retry.trim());
      }
    }
  }

  // Не сохраняем системные ошибки в историю — иначе они отравляют контекст следующих сообщений
  if (!isAIErrorResponse(answer)) {
    await saveMsg(chatId, mode, 'assistant', answer, userId, userName);
  }
  await reply(chatId, answer);

  if (afterReply) await afterReply(chatId, answer);

  // Fire-and-forget: обновляем долгосрочную память бота
  if (platform) {
    const newCount = (botMemory?.messages_count ?? 0) + 1;
    const patch    = extractBotMemoryPatch(text);
    void saveBotMemory(chatId, platform, { ...patch, messages_count: 1 }, botMemory);
    // Синтез каждые 2 сообщения (было 5) — факты не теряются если пользователь ушёл раньше
    if (newCount % 2 === 0 && newCount > 0) {
      const allMsgs = [...history, { role: 'assistant' as const, content: answer }];
      void synthesizeBotNotes(chatId, platform, allMsgs, botMemory?.ai_notes ?? null);
    }
  }
}

// ── Full Message Processor ────────────────────────────────────────────────────

export async function processMessage(opts: {
  chatId: number;
  text: string;
  userName: string | null;
  userId?: number | null;
  mode: string;
  createdVia: string;
  pending: Map<number, PendingBooking>;
  reply: ReplyFn;
  visionDescription?: string;
  platform?: 'tg' | 'max';
  afterReply?: (chatId: number, answer?: string) => Promise<void>;
}): Promise<void> {
  const { chatId, text, userName, userId, mode, createdVia, pending: pendingMap, reply: replyFn, visionDescription, platform, afterReply } = opts;
  const cmd = text.split(' ')[0]?.toLowerCase() ?? '';

  // /start
  if (cmd === '/start') {
    const name = userName ?? 'друг';
    await replyFn(chatId, [
      `Привет, ${name}! Я Кузьмич — AI-агент платформы TourHab.`,
      '',
      '<b>Что умею:</b>',
      '- Подобрать тур: рыбалка, вулканы, медведи, термальные источники...',
      '- Открыть заявку на тур прямо в чате',
      '- Рассказать про маршруты, сезоны, снаряжение',
      '- Предупредить об опасностях на маршруте',
      '- Определить место по фото',
      '',
      'Пиши что интересует — или просто пришли фото.',
    ].join('\n'));
    return;
  }

  // /help
  if (cmd === '/help') {
    await replyFn(chatId, [
      '<b>Кузьмич — многофункциональный агент TourHab</b>',
      '',
      '<b>Туры и бронирование:</b>',
      '"хочу рыбалку в июле, 3 человека"',
      '"медведи, бюджет 20к" → тур + цена',
      '"бронирую" → запускает форму заявки',
      '',
      '<b>Советы и маршруты:</b>',
      '"что взять на восхождение на Авачу?"',
      '"когда лучше ехать на Камчатку?"',
      '"опасно ли сейчас на Мутновском?"',
      '',
      '<b>Безопасность:</b>',
      'SOS → tourhab.ru → кнопка SOS',
      'Экстренная: 112 | МЧС: 8-415-2-11-05-05',
      '',
      '<b>Фото:</b> пришли снимок — скажу где это',
      '',
      '/reset — очистить историю',
    ].join('\n'));
    return;
  }

  // /reset
  if (cmd === '/reset') {
    await deleteBookingFlow(chatId, mode, pendingMap);
    await pool.query(
      `DELETE FROM tg_conversations WHERE chat_id = $1 AND mode = $2`,
      [chatId, mode],
    ).catch(() => {});
    await replyFn(chatId, 'История очищена. С чего начнём?');
    return;
  }

  // Active booking flow — проверяем память И базу данных
  // Фото и голос НЕ попадают в booking flow — это контент для AI
  const isMediaMessage = !!visionDescription || createdVia.includes('voice');
  const activeBooking = !isMediaMessage ? await loadBookingFlow(chatId, mode, pendingMap) : null;
  if (activeBooking) {
    // Auto-expire: если booking flow старше 30 минут — удаляем
    if (activeBooking.started_at < Date.now() - 30 * 60 * 1000) {
      await deleteBookingFlow(chatId, mode, pendingMap);
    } else {
      const handled = await handleBookingStep(chatId, text, mode, pendingMap, replyFn, createdVia);
      if (handled) return;
    }
    // handleBookingStep вернул false или flow expired → продолжаем в AI chat
  }

  // Booking trigger
  if (isBookingTrigger(text)) {
    const history = await getHistory(chatId, mode);
    await startBooking(chatId, text, mode, history, pendingMap, replyFn);
    return;
  }

  // Free AI chat (с vision если есть)
  await aiChat({ chatId, text, mode, reply: replyFn, userId, userName, visionDescription, pending: pendingMap, platform, afterReply });
}
