/**
 * POST /api/telegram/kuzmich
 * Публичный Telegram-бот Кузьмич — выбор тура + бронирование прямо в чате.
 *
 * Флоу брони:
 *   Турист: "хочу рыбалку" → Кузьмич подбирает тур → "бронируй" →
 *   Кузьмич спрашивает имя → дату → кол-во человек → телефон →
 *   подтверждение → INSERT в operator_bookings → номер брони
 *
 * Env vars: TELEGRAM_KUZMICH_BOT_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

// ── Системный промпт ──────────────────────────────────────────────────────────

const KUZMICH_SYSTEM = `Ты Кузьмич — камчадал в третьем поколении, проводник и помощник платформы TourHab.

Помогаешь туристам выбрать тур на Камчатке и забронировать его прямо в чате.
Знаешь всё про регион: вулканы, рыбалку, медведей, термальные источники, вертолёты, снегоходы.

Стиль: живой, разговорный, немного ироничный — но профессиональный.
Отвечай кратко. Не рекламный пафос. Отвечай на языке туриста.

Когда турист выбрал тур и хочет забронировать — скажи ему написать "бронирую" или "хочу этот".
Если спрашивает цены — называй диапазоны.`;

// ── Состояние брони (in-memory, expires 30 мин) ───────────────────────────────

interface TourRow { id: number; title: string; base_price: number; duration_days: number | null }

interface PendingBooking {
  tour: TourRow;
  name?: string;
  phone?: string;
  participants?: number;
  date?: string;       // YYYY-MM-DD
  step: 'name' | 'date' | 'participants' | 'phone' | 'confirm';
  started_at: number;
}

const pending = new Map<number, PendingBooking>();

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of pending) {
    if (v.started_at < cutoff) pending.delete(k);
  }
}, 5 * 60 * 1000);

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getHistory(chatId: number): Promise<ChatMessage[]> {
  try {
    const { rows } = await pool.query<{ role: string; content: string }>(
      `SELECT role, content FROM tg_conversations
       WHERE chat_id = $1 AND mode = 'tourist'
       ORDER BY created_at DESC LIMIT 20`,
      [chatId],
    );
    return rows.reverse() as ChatMessage[];
  } catch { return []; }
}

async function saveMsg(chatId: number, role: 'user' | 'assistant', content: string) {
  try {
    await pool.query(
      `INSERT INTO tg_conversations (chat_id, mode, role, content) VALUES ($1,'tourist',$2,$3)`,
      [chatId, role, content],
    );
  } catch { /* не блокируем */ }
}

async function findTour(keywords: string[]): Promise<TourRow | null> {
  try {
    const patterns = keywords.map(k => `%${k}%`);
    const { rows } = await pool.query<TourRow>(
      `SELECT id, title, base_price, duration_days
       FROM operator_tours
       WHERE is_active = true AND deleted_at IS NULL
         AND (${patterns.map((_, i) => `(title ILIKE $${i + 1} OR category ILIKE $${i + 1})`).join(' OR ')})
       ORDER BY base_price ASC LIMIT 1`,
      patterns,
    );
    return rows[0] ?? null;
  } catch { return null; }
}

async function createBooking(b: Required<Omit<PendingBooking, 'step' | 'started_at'>>): Promise<number | null> {
  try {
    const total = b.tour.base_price * b.participants;
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO operator_bookings
         (operator_tour_id, tour_id, tourist_name, tourist_phone,
          participants, booking_date, booking_status,
          base_total_price, final_price, created_via)
       VALUES ($1,$1,$2,$3,$4,$5,'new',$6,$6,'telegram')
       RETURNING id`,
      [b.tour.id, b.name, b.phone, b.participants, b.date, total],
    );
    return rows[0]?.id ?? null;
  } catch { return null; }
}

// ── Telegram helper ───────────────────────────────────────────────────────────

async function reply(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_KUZMICH_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── Парсинг даты из свободного текста ────────────────────────────────────────

const MONTHS: Record<string, string> = {
  'января':'01','январе':'01','январь':'01',
  'февраля':'02','феврале':'02','февраль':'02',
  'марта':'03','марте':'03','март':'03',
  'апреля':'04','апреле':'04','апрель':'04',
  'мая':'05','мае':'05','май':'05',
  'июня':'06','июне':'06','июнь':'06',
  'июля':'07','июле':'07','июль':'07',
  'августа':'08','августе':'08','август':'08',
  'сентября':'09','сентябре':'09','сентябрь':'09',
  'октября':'10','октябре':'10','октябрь':'10',
  'ноября':'11','ноябре':'11','ноябрь':'11',
  'декабря':'12','декабре':'12','декабрь':'12',
};

function parseDate(text: string): string | null {
  const t = text.toLowerCase().trim();

  // ISO: 2026-07-15
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD.MM.YYYY или DD/MM/YYYY
  const dmy = t.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;

  // DD.MM или DD/MM (подставляем ближайший год)
  const dm = t.match(/(\d{1,2})[./](\d{1,2})/);
  if (dm) {
    const year = new Date().getFullYear();
    return `${year}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
  }

  // "15 июля" / "15 июля 2026"
  const rus = t.match(/(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?/);
  if (rus) {
    const month = MONTHS[rus[2]];
    if (month) {
      const year = rus[3] ?? String(new Date().getFullYear());
      return `${year}-${month}-${rus[1].padStart(2,'0')}`;
    }
  }

  return null;
}

// ── Ключевые слова для определения категории тура ─────────────────────────────

function extractTourKeywords(text: string): string[] {
  const t = text.toLowerCase();
  const map: Record<string, string[]> = {
    'рыбалка':   ['рыбалк', 'рыб', 'fishing', 'fishing', 'лосось', 'нерка'],
    'вулкан':    ['вулкан', 'volcano', 'кратер', 'авача'],
    'медведи':   ['медвед', 'bear', 'курильское'],
    'термальные':['термал', 'горячие источники', 'купальн', 'паратунк'],
    'вертолет':  ['вертолет', 'вертолёт', 'helicopter', 'heli'],
    'снегоход':  ['снегоход', 'снег', 'snowmobile', 'зимн'],
    'катер':     ['катер', 'море', 'лодк', 'boat'],
    'треккинг':  ['треккинг', 'поход', 'пеший', 'trekking', 'hiking'],
  };
  const found: string[] = [];
  for (const [key, triggers] of Object.entries(map)) {
    if (triggers.some(tr => t.includes(tr))) found.push(key);
  }
  return found.length ? found : [text.slice(0, 30)];
}

// ── Триггеры бронирования ─────────────────────────────────────────────────────

const BOOKING_TRIGGERS = [
  'бронирую', 'забронируй', 'хочу этот', 'беру', 'записывай',
  'оформи', 'оформляй', 'хочу записаться', 'давай бронируем',
  'бронируем', 'возьму', 'book', 'reserve', 'хочу забронировать',
];

function isBookingTrigger(text: string): boolean {
  const t = text.toLowerCase();
  return BOOKING_TRIGGERS.some(tr => t.includes(tr));
}

const YES = ['да', 'yes', 'верно', 'подтверждаю', 'всё верно', 'ок', 'ok', 'го', 'давай', 'подтвердить'];
const NO  = ['нет', 'no', 'не верно', 'отмена', 'cancel', 'стоп', 'stop', 'отменить', 'назад'];

function isYes(t: string) { return YES.some(y => t.toLowerCase().includes(y)); }
function isNo(t: string)  { return NO.some(n => t.toLowerCase().includes(n)); }

// ── Обработка шага брони ──────────────────────────────────────────────────────

async function handleBookingStep(chatId: number, text: string): Promise<boolean> {
  const b = pending.get(chatId);
  if (!b) return false;

  const t = text.trim();

  if (b.step === 'name') {
    if (t.length < 2) {
      await reply(chatId, 'Укажите полное имя (минимум 2 символа).');
      return true;
    }
    b.name = t;
    b.step = 'date';
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

    const dateStr = new Date(b.date!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const total   = (b.tour.base_price * b.participants!).toLocaleString('ru-RU');

    await reply(chatId, [
      '<b>Проверьте данные брони:</b>',
      '',
      `Тур: <b>${b.tour.title}</b>`,
      `Дата: <b>${dateStr}</b>`,
      `Человек: <b>${b.participants}</b>`,
      `Сумма: <b>${total} ₽</b>`,
      `Имя: <b>${b.name}</b>`,
      `Телефон: <b>${b.phone}</b>`,
      '',
      'Всё верно? Напишите <b>Да</b> для подтверждения или <b>Нет</b> для отмены.',
    ].join('\n'));
    return true;
  }

  if (b.step === 'confirm') {
    if (isNo(t)) {
      pending.delete(chatId);
      await reply(chatId, 'Бронирование отменено. Если что — пиши, помогу.');
      return true;
    }
    if (!isYes(t)) {
      await reply(chatId, 'Напишите <b>Да</b> для подтверждения или <b>Нет</b> для отмены.');
      return true;
    }

    // Создаём бронь
    const bookingId = await createBooking(b as Required<Omit<PendingBooking, 'step' | 'started_at'>>);
    pending.delete(chatId);

    if (!bookingId) {
      await reply(chatId, 'Не удалось создать бронирование. Попробуйте позже или позвоните оператору напрямую.');
      return true;
    }

    const dateStr = new Date(b.date!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    await reply(chatId, [
      `Бронирование создано! Номер брони: <b>#${bookingId}</b>`,
      '',
      `Тур: ${b.tour.title}`,
      `Дата: ${dateStr}`,
      `Человек: ${b.participants}`,
      '',
      'Оператор свяжется с вами в течение 1 часа для подтверждения.',
      '',
      `<a href="https://tourhab.ru/booking-success/${bookingId}">Открыть бронирование →</a>`,
    ].join('\n'));
    return true;
  }

  return false;
}

// ── Начало флоу брони ─────────────────────────────────────────────────────────

async function startBooking(chatId: number, text: string, history: ChatMessage[]): Promise<boolean> {
  // Извлекаем ключевые слова из последних сообщений
  const lastUserMsg = history.filter(m => m.role === 'user').slice(-3).map(m => m.content).join(' ');
  const lastAiMsg   = history.filter(m => m.role === 'assistant').slice(-1)[0]?.content ?? '';
  const context     = `${text} ${lastUserMsg} ${lastAiMsg}`;
  const keywords    = extractTourKeywords(context);

  const tour = await findTour(keywords);
  if (!tour) {
    await reply(chatId, 'Уточни, какой тур хочешь забронировать? Напиши: рыбалка, вулканы, медведи, термальные источники...');
    return true;
  }

  pending.set(chatId, {
    tour,
    step: 'name',
    started_at: Date.now(),
  });

  await reply(chatId, [
    `Бронируем <b>${tour.title}</b>`,
    `Стоимость от <b>${tour.base_price.toLocaleString('ru-RU')} ₽</b> с человека.`,
    '',
    'Как вас зовут? (полное имя для брони)',
  ].join('\n'));
  return true;
}

// ── POST: Webhook ─────────────────────────────────────────────────────────────

interface TgUpdate {
  message?: { chat: { id: number }; from?: { id: number; first_name?: string }; text?: string };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update = await request.json() as TgUpdate;
    const msg = update.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const text   = msg.text.trim();
    const cmd    = text.split(' ')[0]?.toLowerCase() ?? '';

    // /start
    if (cmd === '/start') {
      const name = msg.from?.first_name ?? 'турист';
      await reply(chatId, [
        `Привет, ${name}! Я Кузьмич — помогу выбрать и забронировать тур на Камчатке прямо здесь.`,
        '',
        'Напиши что хочешь: рыбалка, вулканы, медведи, термальные источники...',
        'Или сразу: <b>хочу рыбалку 15 июля, 2 человека</b>',
      ].join('\n'));
      return NextResponse.json({ ok: true });
    }

    // /help
    if (cmd === '/help') {
      await reply(chatId, [
        '<b>Что умею:</b>',
        '',
        '• Подобрать тур под запрос',
        '• <b>Забронировать тур прямо в чате</b>',
        '• Рассказать про Камчатку',
        '',
        '<b>Примеры:</b>',
        '"хочу рыбалку в июле на 3 дня"',
        '"медведи для двоих, бюджет 20к"',
        '"бронируй" — начать оформление',
        '',
        '/reset — очистить историю',
      ].join('\n'));
      return NextResponse.json({ ok: true });
    }

    // /reset
    if (cmd === '/reset') {
      pending.delete(chatId);
      await pool.query(
        `DELETE FROM tg_conversations WHERE chat_id = $1 AND mode = 'tourist'`,
        [chatId],
      ).catch(() => {});
      await reply(chatId, 'История очищена. С чего начнём?');
      return NextResponse.json({ ok: true });
    }

    // Если идёт флоу брони — обрабатываем шаг
    if (pending.has(chatId)) {
      await handleBookingStep(chatId, text);
      return NextResponse.json({ ok: true });
    }

    // Триггер бронирования
    if (isBookingTrigger(text)) {
      const history = await getHistory(chatId);
      await startBooking(chatId, text, history);
      return NextResponse.json({ ok: true });
    }

    // Обычный диалог с Кузьмичом
    await saveMsg(chatId, 'user', text);
    const history = await getHistory(chatId);

    const messages: ChatMessage[] = [
      { role: 'system', content: KUZMICH_SYSTEM },
      ...history,
    ];

    const response = await callAIWaterfall(messages);
    const safe = response?.trim() || 'Что-то с сигналом... Попробуй ещё раз.';

    await saveMsg(chatId, 'assistant', safe);
    await reply(chatId, safe);

  } catch { /* Telegram требует 200 OK всегда */ }

  return NextResponse.json({ ok: true });
}
