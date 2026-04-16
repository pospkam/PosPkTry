/**
 * lib/kuzmich/operator-chat.ts
 *
 * AI-помощник для операторов в Telegram.
 * Оператор пишет боту → получает ответ с контекстом своего бизнеса.
 *
 * Умеет отвечать на:
 * - "сколько бронирований на этой неделе?"
 * - "есть ли свободные места на 20 июля?"
 * - "помоги написать ответ туристу"
 * - "какие туры сейчас активны?"
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import { getHistory, saveMsg } from '@/lib/kuzmich/core';
import type { ChatMessage } from '@/lib/ai/prompts';

interface OperatorContext {
  partnerId: number;
  partnerName: string;
}

/** Найти оператора по telegram_chat_id. Возвращает null если не оператор. */
export async function findOperatorByChatId(chatId: number): Promise<OperatorContext | null> {
  try {
    const { rows } = await pool.query<{ id: number; name: string }>(
      `SELECT id, COALESCE(company_name, name) AS name
       FROM partners
       WHERE telegram_chat_id = $1 AND status != 'blocked'
       LIMIT 1`,
      [String(chatId)],
    );
    if (!rows[0]) return null;
    return { partnerId: rows[0].id, partnerName: rows[0].name };
  } catch { return null; }
}

/**
 * Привязать chat_id к оператору по email.
 * Используется при команде /partner EMAIL.
 * Возвращает имя оператора если успешно, null если email не найден.
 */
export async function registerOperatorChatId(
  chatId: number,
  email: string,
): Promise<string | null> {
  try {
    const { rows } = await pool.query<{ id: number; name: string; telegram_chat_id: string | null }>(
      `SELECT id, COALESCE(company_name, name) AS name, telegram_chat_id
       FROM partners
       WHERE LOWER(contact->>'email') = LOWER($1) AND status != 'blocked'
       LIMIT 1`,
      [email.trim()],
    );
    if (!rows[0]) return null;

    // Уже привязан к этому же chat_id — OK
    if (rows[0].telegram_chat_id === String(chatId)) return rows[0].name;

    // Привязываем
    await pool.query(
      `UPDATE partners SET telegram_chat_id = $1, updated_at = NOW() WHERE id = $2`,
      [String(chatId), rows[0].id],
    );
    return rows[0].name;
  } catch (err) {
    console.error('[operator-chat] registerOperatorChatId failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Привязать MAX chat_id к оператору по email.
 * Используется при команде "партнер EMAIL" в MAX боте.
 */
export async function registerOperatorMaxChatId(
  chatId: number,
  email: string,
): Promise<string | null> {
  try {
    const { rows } = await pool.query<{ id: number; name: string; max_chat_id: string | null }>(
      `SELECT id, COALESCE(company_name, name) AS name, max_chat_id
       FROM partners
       WHERE LOWER(contact->>'email') = LOWER($1) AND status != 'blocked'
       LIMIT 1`,
      [email.trim()],
    );
    if (!rows[0]) return null;
    if (rows[0].max_chat_id === String(chatId)) return rows[0].name;
    await pool.query(
      `UPDATE partners SET max_chat_id = $1, updated_at = NOW() WHERE id = $2`,
      [chatId, rows[0].id],
    );
    return rows[0].name;
  } catch (err) {
    console.error('[operator-chat] registerOperatorMaxChatId failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Найти оператора по MAX chat_id. */
export async function findOperatorByMaxChatId(chatId: number): Promise<OperatorContext | null> {
  try {
    const { rows } = await pool.query<{ id: number; name: string }>(
      `SELECT id, COALESCE(company_name, name) AS name
       FROM partners
       WHERE max_chat_id = $1 AND status != 'blocked'
       LIMIT 1`,
      [chatId],
    );
    if (!rows[0]) return null;
    return { partnerId: rows[0].id, partnerName: rows[0].name };
  } catch { return null; }
}

/** Загрузить бизнес-контекст оператора для системного промпта. */
async function buildOperatorContext(partnerId: number, partnerName: string): Promise<string> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());

  const [toursResult, bookingsResult, pendingResult] = await Promise.allSettled([
    pool.query<{ id: number; title: string; base_price: number; is_active: boolean; available_slots: number | null }>(
      `SELECT id, title, base_price, is_active,
              available_slots, next_available_date::text
       FROM operator_tours
       WHERE operator_id = (SELECT user_id FROM partners WHERE id = $1)
         AND deleted_at IS NULL
       ORDER BY is_active DESC, created_at DESC
       LIMIT 10`,
      [partnerId],
    ),
    pool.query<{ tourist_name: string; booking_date: string; participants: number; final_price: number; booking_status: string }>(
      `SELECT ob.tourist_name, ob.booking_date::text, ob.participants,
              ob.final_price, ob.booking_status
       FROM operator_bookings ob
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       WHERE ot.operator_id = (SELECT user_id FROM partners WHERE id = $1)
         AND ob.created_at >= $2
       ORDER BY ob.created_at DESC
       LIMIT 10`,
      [partnerId, weekStart.toISOString()],
    ),
    pool.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM operator_bookings ob
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       WHERE ot.operator_id = (SELECT user_id FROM partners WHERE id = $1)
         AND ob.booking_status IN ('pending_payment','confirmed')
         AND ob.booking_date >= CURRENT_DATE`,
      [partnerId],
    ),
  ]);

  const tours =
    toursResult.status === 'fulfilled'
      ? toursResult.value.rows
      : [];
  const weekBookings =
    bookingsResult.status === 'fulfilled'
      ? bookingsResult.value.rows
      : [];
  const pendingCount =
    pendingResult.status === 'fulfilled'
      ? parseInt(pendingResult.value.rows[0]?.cnt ?? '0', 10)
      : 0;

  const toursText = tours.length
    ? tours
        .map(
          t =>
            `- "${t.title}" | ${t.base_price.toLocaleString('ru-RU')} ₽/чел | ${t.is_active ? 'активен' : 'неактивен'}${t.available_slots != null ? ` | мест: ${t.available_slots}` : ''}`,
        )
        .join('\n')
    : 'Туры не найдены.';

  const bookingsText = weekBookings.length
    ? weekBookings
        .map(
          b =>
            `- ${b.tourist_name}, ${b.participants} чел, ${new Date(b.booking_date).toLocaleDateString('ru-RU')}, ${Number(b.final_price).toLocaleString('ru-RU')} ₽ [${b.booking_status}]`,
        )
        .join('\n')
    : 'Бронирований на этой неделе нет.';

  return [
    `ОПЕРАТОР: ${partnerName}`,
    `Предстоящих активных бронирований: ${pendingCount}`,
    '',
    `МОИ ТУРЫ:`,
    toursText,
    '',
    `БРОНИРОВАНИЯ ЗА ПОСЛЕДНИЕ 7 ДНЕЙ:`,
    bookingsText,
  ].join('\n');
}

const OPERATOR_SYSTEM = `Ты AI-помощник оператора на туристической платформе TourHab (Камчатка).
Помогаешь оператору управлять бизнесом: отвечаешь на вопросы о бронированиях, турах, статистике.
Также помогаешь составлять ответы туристам и рекомендации по оптимизации туров.
Общайся на русском, по делу. Данные о бизнесе оператора прилагаются ниже.`;

export async function processOperatorMessage(opts: {
  chatId: number;
  text: string;
  fromName: string | null;
  operator: OperatorContext;
  reply: (chatId: number, text: string) => Promise<void>;
}): Promise<void> {
  const { chatId, text, fromName, operator, reply } = opts;

  await saveMsg(chatId, 'operator_tg', 'user', text, null, fromName);

  const [history, bizContext] = await Promise.all([
    getHistory(chatId, 'operator_tg'),
    buildOperatorContext(operator.partnerId, operator.partnerName),
  ]);

  const systemContent = `${OPERATOR_SYSTEM}\n\n${bizContext}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...history,
  ];

  let answer: string;
  try {
    answer = (await callAIWaterfall(messages))?.trim() ?? '';
  } catch {
    answer = '';
  }

  if (!answer) {
    answer = 'Не могу ответить прямо сейчас. Попробуй ещё раз.';
  }

  await saveMsg(chatId, 'operator_tg', 'assistant', answer, null, null);
  await reply(chatId, answer);
}
