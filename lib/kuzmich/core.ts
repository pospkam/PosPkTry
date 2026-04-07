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
  duration_days: number | null;
  category?: string | null;
}

export interface PendingBooking {
  tour: TourRow;
  name?: string;
  phone?: string;
  participants?: number;
  date?: string; // YYYY-MM-DD
  step: 'name' | 'date' | 'participants' | 'phone' | 'confirm';
  started_at: number;
}

// ── Системный промпт ──────────────────────────────────────────────────────────

export const KUZMICH_SYSTEM = `Ты Кузьмич — камчатский агент по бронированию туров на платформе TourHab.

ГЛАВНАЯ ЦЕЛЬ: помочь туристу выбрать тур и оформить бронирование прямо в чате.
Ты не просто рассказываешь про Камчатку — ты продаёшь и бронируешь туры.

Знаешь всё про регион: вулканы, рыбалку, медведей, термальные источники, вертолёты, снегоходы.
Стиль: живой, немного с юмором — но конкретный и профессиональный. Коротко, по делу.

ЯЗЫК: определи язык сообщения и отвечай НА ТОМ ЖЕ ЯЗЫКЕ.
Русский / English / 日本語 / 한국어 / Deutsch / 中文 / Français / Español.

ТАКТИКА ПРОДАЖИ:
1. Понять что хочет турист (вид активности, даты, бюджет, группа)
2. Назвать конкретный тур из списка ниже с ценой
3. Спросить: "Берём? Напишите бронирую"
4. Если пишет "бронирую" / "беру" / "хочу этот" → сразу начать форму

НИКОГДА: * ** # _ символы markdown.`;


// ── Загрузка реальных туров из БД (контекст знаний) ─────────────────────────

interface TourContextRow {
  id: number;
  title: string;
  base_price: number;
  duration_days: number | null;
  category: string | null;
  location_name: string | null;
  operator_name: string | null;
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
      SELECT ot.id, ot.title, ot.base_price, ot.duration_days, ot.category,
             ot.location_name,
             u.company_name AS operator_name
      FROM operator_tours ot
      LEFT JOIN users u ON u.id = ot.operator_id
      WHERE ot.is_active = true AND ot.deleted_at IS NULL
      ORDER BY ot.base_price ASC
      LIMIT 40
    `);

    if (!rows.length) return '';

    const lines = rows.map(r => {
      const dur = r.duration_days ? `${r.duration_days} дн.` : '';
      const price = `от ${Number(r.base_price).toLocaleString('ru-RU')} р/чел`;
      const cat = r.category ? `[${r.category}]` : '';
      const loc = r.location_name ? ` — ${r.location_name}` : '';
      const op  = r.operator_name ? ` | Оператор: ${r.operator_name}` : '';
      return `ID${r.id}: "${r.title}"${loc} ${cat} ${dur} ${price}${op}`;
    });

    _tourContextCache = [
      'РЕАЛЬНЫЕ ТУРЫ НА ПЛАТФОРМЕ (актуальные цены, называй по имени):',
      ...lines,
      '',
      'Когда турист выбрал тур — предложи забронировать прямо сейчас.',
    ].join('\n');
    _tourContextAt = Date.now();
    return _tourContextCache;
  } catch {
    return '';
  }
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

export function extractTourKeywords(text: string): string[] {
  const t = text.toLowerCase();
  const map: Record<string, string[]> = {
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
  const found: string[] = [];
  for (const [key, triggers] of Object.entries(map)) {
    if (triggers.some(tr => t.includes(tr))) found.push(key);
  }
  return found.length ? found : [text.slice(0, 30)];
}

// ── Триггеры ──────────────────────────────────────────────────────────────────

const BOOKING_TRIGGERS = [
  'бронирую', 'забронируй', 'хочу этот', 'беру', 'записывай',
  'оформи', 'оформляй', 'хочу записаться', 'давай бронируем',
  'бронируем', 'возьму', 'book', 'reserve', 'хочу забронировать',
  'забронировать', 'запишите', 'хочу на этот',
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
      `SELECT id, title, base_price, duration_days, category
       FROM operator_tours
       WHERE is_active = true AND deleted_at IS NULL
         AND (${patterns.map((_, i) => `(title ILIKE $${i + 1} OR category ILIKE $${i + 1})`).join(' OR ')})
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
       VALUES ($1,$1,$2,$3,$4,$5,'new',$6,$6,$7)
       RETURNING id`,
      [b.tour.id, b.name, b.phone, b.participants, b.date, total, createdVia],
    );
    return rows[0]?.id ?? null;
  } catch { return null; }
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

  if (b.step === 'name') {
    if (t.length < 2) {
      await reply(chatId, 'Укажите полное имя (минимум 2 символа).');
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
    await reply(chatId, 'Ваш номер телефона — оператор свяжется для подтверждения.\n\nПример: <b>+7 900 000-00-00</b>');
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
    const total = (b.tour.base_price * b.participants!).toLocaleString('ru-RU');

    await reply(chatId, [
      '<b>Проверьте данные брони:</b>',
      '',
      `Тур: <b>${b.tour.title}</b>`,
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
    await reply(chatId, [
      `Бронирование создано! Номер: <b>#${bookingId}</b>`,
      '',
      `Тур: ${b.tour.title}`,
      `Дата: ${dateStr}`,
      `Человек: ${b.participants}`,
      '',
      'Оператор свяжется с вами в течение 1 часа для подтверждения.',
      '',
      `<a href="https://tourhab.ru/booking-success/${bookingId}">Открыть бронирование</a>`,
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
    await reply(chatId, 'Уточни, какой тур хочешь забронировать?\n\nНапиши: рыбалка, вулканы, медведи, термальные источники...');
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

  // Проактивное предложение бронирования:
  // Если в тексте есть туристический интент И бот ещё не в booking flow
  // → дополняем ответ предложением
  if (!pending.has(chatId) && !isBookingTrigger(text)) {
    const keywords = extractTourKeywords(text);
    const hasTourKeyword = keywords.length > 0 && keywords[0] !== text.slice(0, 30);
    const alreadySuggestsBooking = answer.toLowerCase().includes('бронир') ||
                                    answer.toLowerCase().includes('book');
    if (hasTourKeyword && !alreadySuggestsBooking) {
      // Проверяем что есть подходящий тур в БД
      const tour = await findTour(keywords);
      if (tour) {
        answer += `\n\nЕсть интерес? Напиши <b>бронирую</b> — оформим прямо здесь.`;
      }
    }
  }

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
    const name = userName ?? 'турист';
    await replyFn(chatId, [
      `Привет, ${name}! Я Кузьмич — помогу выбрать и забронировать тур на Камчатке прямо здесь.`,
      '',
      'Напиши что хочешь: рыбалка, вулканы, медведи, термальные источники...',
      'Или сразу: <b>хочу рыбалку 15 июля, 2 человека</b>',
      '',
      'Можешь прислать фото — разберёмся что за место.',
    ].join('\n'));
    return;
  }

  // /help
  if (cmd === '/help') {
    await replyFn(chatId, [
      '<b>Что умею:</b>',
      '',
      'Подобрать тур под запрос',
      '<b>Забронировать прямо в чате</b>',
      'Рассказать про Камчатку',
      'Определить место по фото',
      '',
      '<b>Примеры:</b>',
      '"хочу рыбалку в июле на 3 дня"',
      '"медведи для двоих, бюджет 20к"',
      '"бронирую" — начать оформление',
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
    await handleBookingStep(chatId, text, mode, pendingMap, replyFn, createdVia);
    return;
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
