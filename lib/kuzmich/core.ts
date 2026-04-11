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
import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

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
function cleanAIResponse(raw: string): string {
  let t = raw;
  // Strip emoji codepoints
  t = t.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
  // **bold** → bold (strip markdown bold)
  t = t.replace(/\*\*(.+?)\*\*/g, '$1');
  t = t.replace(/__(.+?)__/g, '$1');
  // *italic* → italic
  t = t.replace(/(?<!\n)\*(?!\s)(.+?)(?<!\s)\*/g, '$1');
  // # headers → plain
  t = t.replace(/^#{1,6}\s+/gm, '');
  // * bullet lists → dash
  t = t.replace(/^\*\s+/gm, '- ');
  // ``` code blocks → plain
  t = t.replace(/```[\s\S]*?```/g, '');
  // Clean up multiple spaces/newlines left after stripping
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

export const KUZMICH_SYSTEM = `Ты Кузьмич — AI-помощник платформы TourHab по туризму на Камчатке.
Ты помогаешь человеку честно спланировать поездку и безопасно выйти на реальный тур.

ТВОИ РОЛИ:

1. ПОМОЩНИК И ПЛАНИРОВЩИК (главная роль)
  Помогаешь выбрать маршрут по сезону, уровню, бюджету и целям поездки.
  Объясняешь плюсы/риски вариантов простым языком.

2. НАВИГАТОР ПО РЕАЛЬНЫМ ТУРАМ
  Показываешь только те предложения, которые есть в данных ниже.
  Называешь цену и длительность как ориентир из системы.
  Обязательно уточняй, что финальные детали (доступность мест, погода, точный состав) подтверждаются перед оплатой.

3. СОВЕТНИК ПО БЕЗОПАСНОСТИ
  Предупреждаешь об опасностях: погода, вулканы, медведи, сложность маршрута.
  Экстренно: SOS tourhab.ru, телефон 112, МЧС 8-415-2-11-05-05.

ЖЁСТКИЕ ПРАВИЛА:
- НИКАКИХ ЭМОДЗИ. Ни одного. Никогда. Это техническое ограничение.
- Не придумывай туры, цены, факты, места и доступность.
- НОВОСТИ И СОБЫТИЯ: ты НЕ знаешь текущих новостей, если они не указаны в блоке "АКТУАЛЬНЫЕ НОВОСТИ" ниже. Если спрашивают про конкретное событие, которого нет в твоих данных — прямо скажи "у меня нет подтверждённой информации об этом". НИКОГДА не выдумывай события, ЧП, аварии или факты.
- Если данных недостаточно — прямо скажи это и предложи безопасный следующий шаг.
- Не дави на бронирование и не обещай гарантии, которых у тебя нет.
- Не предлагай бронирование первым. Только если человек сам спросит.
- Не говори, что уже "связался" или "договорился" с оператором, если это не сделано системой.
- Не обещай "мгновенное подтверждение" или "100% наличие мест".
- Не используй восклицательные знаки через каждое предложение.
- ССЫЛКИ: ты не можешь открывать ссылки. Но НИКОГДА не говори "не могу открывать ссылки". Вместо этого узнай домен (t.me = Telegram-канал, vk.com = ВК, youtube = видео и т.д.) и ответь по контексту. Пример: если прислали t.me/minec_tourism — скажи "Да, канал Минэкономразвития по туризму — полезный источник. Что оттуда хочешь обсудить?"

ЕСЛИ ЧЕЛОВЕК ГОТОВ ОФОРМЛЯТЬ:
-> Коротко дай резюме: тур, цена-ориентир, что уточняется перед оплатой.
-> Если человек сам спросит про бронирование — объясни как оставить заявку.

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

export async function buildTourContext(): Promise<string> {
  if (_tourContextCache && Date.now() - _tourContextAt < CACHE_TTL_MS) {
    return _tourContextCache;
  }
  try {
    const { rows } = await pool.query<TourContextRow>(`
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
    `);

    if (!rows.length) return '';

    const lines = rows.map(r => {
      const dur   = r.multi_day_count ? `${r.multi_day_count} дн.` : '';
      const price = `от ${Number(r.base_price).toLocaleString('ru-RU')} р/чел`;
      const cat   = r.activity_type ? `[${r.activity_type}]` : '';
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

    // Load live context: weather + news + MChS alerts
    const liveBlock = await loadLiveContext();

    _tourContextCache = [
      'РЕАЛЬНЫЕ ТУРЫ НА ПЛАТФОРМЕ (актуальные цены, называй по имени):',
      ...lines,
      '',
      'Когда турист спрашивает о конкретном туре — дай факты. Не предлагай бронирование первым.',
      liveBlock,
    ].filter(Boolean).join('\n');
    _tourContextAt = Date.now();
    return _tourContextCache;
  } catch {
    return '';
  }
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
  'оформи', 'оформляй', 'давай бронируем',
  // короткие / разговорные
  'бронь', 'бронируй', 'запиши меня', 'записать меня', 'хочу тур',
  'оплатим', 'оплачу',
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
    const { rows } = await pool.query<TourRow>(
      `SELECT id, title, base_price, multi_day_count, activity_type
       FROM operator_tours
       WHERE is_active = true AND deleted_at IS NULL
         AND (${patterns.map((_, i) => `(title ILIKE $${i + 1} OR activity_type ILIKE $${i + 1})`).join(' OR ')})
       ORDER BY base_price ASC LIMIT 1`,
      patterns,
    );
    return rows[0] ?? null;
  } catch { return null; }
}

export async function createBooking(
  b: Required<Omit<PendingBooking, 'step' | 'started_at'>>,
  createdVia: string,
): Promise<number | null> {
  try {
    const total = b.tour.base_price * b.participants;
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO operator_bookings
         (operator_tour_id, tour_id, tourist_name, tourist_phone,
          participants, booking_date, booking_status,
          base_total_price, final_price, created_via)
       VALUES ($1,$1,$2,$3,$4,$5,'pending_payment',$6,$6,$7)
       RETURNING id`,
      [b.tour.id, b.name, b.phone, b.participants, b.date, total, createdVia],
    );
    const bookingId = rows[0]?.id ?? null;

    // Уведомить оператора в Telegram (не блокируем ответ)
    if (bookingId) {
      void notifyOperatorNewBooking(bookingId, b, total);
    }

    return bookingId;
  } catch { return null; }
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
    // Имя: 2-40 символов, только буквы/пробелы/дефис, без цифр и спецсимволов
    // Вопросы, команды и длинные фразы — это не имя
    if (t.length < 2 || t.length > 40 || /[?!0-9]/.test(t) || !/^[\p{L}\s\-'.]+$/u.test(t)) {
      // Если это выглядит как вопрос или обычное сообщение — выходим в AI
      if (t.includes('?') || t.length > 40 || /\s{2,}/.test(t) || t.split(/\s+/).length > 5) {
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
    const phone = t.replace(/\s/g, '');
    if (phone.length < 10) {
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

    const bookingId = await createBooking(
      b as Required<Omit<PendingBooking, 'step' | 'started_at'>>,
      createdVia,
    );
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
  const lastUserMsg = history.filter(m => m.role === 'user').slice(-3).map(m => m.content).join(' ');
  const lastAiMsg = history.filter(m => m.role === 'assistant').slice(-1)[0]?.content ?? '';
  const context = `${text} ${lastUserMsg} ${lastAiMsg}`;
  const keywords = extractTourKeywords(context);

  const tour = await findTour(keywords);
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

// ── AI Chat с знаниями из БД ──────────────────────────────────────────────────

export async function aiChat(opts: {
  chatId: number;
  text: string;
  mode: string;
  reply: ReplyFn;
  userId?: number | null;
  userName?: string | null;
  visionDescription?: string;          // описание фото от Gemini
  pending: Map<number, PendingBooking>;
}): Promise<void> {
  const { chatId, text, mode, reply, userId, userName, visionDescription, pending } = opts;

  // Сохраняем сообщение пользователя
  const userContent = visionDescription
    ? `[Фото: ${visionDescription}]\n${text || ''}`.trim()
    : text;
  await saveMsg(chatId, mode, 'user', userContent, userId, userName);

  const history = await getHistory(chatId, mode);
  const tourContext = await buildTourContext();

  // Строим системный промпт с реальными данными о турах
  const systemContent = tourContext
    ? `${KUZMICH_SYSTEM}\n\n${tourContext}`
    : KUZMICH_SYSTEM;

  // Если есть описание фото — прокидываем его первым сообщением
  const extraUserMsg: ChatMessage[] = visionDescription
    ? [{ role: 'user', content: `Пользователь прислал фото. Вот что на нём: ${visionDescription}` }]
    : [];

  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...history,
    ...extraUserMsg,
  ];

  const response = await callAIWaterfall(messages);
  let answer = response?.trim() || 'Что-то с сигналом... Попробуй ещё раз.';

  // Post-process: strip emoji (hard rule) + clean markdown leftovers
  answer = cleanAIResponse(answer);

  await saveMsg(chatId, mode, 'assistant', answer, userId, userName);
  await reply(chatId, answer);
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
}): Promise<void> {
  const { chatId, text, userName, userId, mode, createdVia, pending: pendingMap, reply: replyFn, visionDescription } = opts;
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
  const activeBooking = await loadBookingFlow(chatId, mode, pendingMap);
  if (activeBooking) {
    const handled = await handleBookingStep(chatId, text, mode, pendingMap, replyFn, createdVia);
    if (handled) return;
    // handleBookingStep вернул false → flow отменён, продолжаем в AI chat
  }

  // Booking trigger
  if (isBookingTrigger(text)) {
    const history = await getHistory(chatId, mode);
    await startBooking(chatId, text, mode, history, pendingMap, replyFn);
    return;
  }

  // Free AI chat (с vision если есть)
  await aiChat({ chatId, text, mode, reply: replyFn, userId, userName, visionDescription, pending: pendingMap });
}
