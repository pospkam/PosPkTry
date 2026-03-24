/**
 * Сервис бронирований — бизнес-логика
 *
 * Отвечает за:
 * - Создание бронирований
 * - Переходы статусов (с валидацией)
 * - Расчёт возвратов при отмене
 * - Логирование каждого изменения статуса в booking_logs
 *
 * Сервис НЕ знает про HTTP — только бизнес-логика и БД.
 * Роли проверяются в API routes, не здесь.
 */

import { PoolClient } from 'pg';
import { query, transaction } from '@/lib/database';
import { notifyBookingConfirmed, notifyBookingCancelled } from '@/lib/notifications/booking-notifications';
import {
  BookingStatus,
  BookingWithDetails,
  BookingLogEntry,
  RefundResult,
  CreateBookingInput,
  RescheduleBookingInput,
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
  CANCELLED_STATUSES,
} from '@/types/booking.types';

// ========================================
// Вспомогательные функции
// ========================================

/**
 * Проверяет допустимость перехода между статусами.
 * Выбрасывает ошибку при запрещённом переходе.
 */
function validateTransition(from: BookingStatus, to: BookingStatus): void {
  if (TERMINAL_STATUSES.has(from)) {
    throw new Error(`Нельзя изменить статус завершённого бронирования (${from})`);
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(`Недопустимый переход статуса: ${from} -> ${to}`);
  }
}

/**
 * Записывает переход статуса в таблицу booking_logs
 * Вызывается ВНУТРИ транзакции (принимает PoolClient)
 */
async function logStatusChange(
  client: PoolClient,
  bookingId: string,
  fromStatus: BookingStatus,
  toStatus: BookingStatus,
  changedBy: string,
  comment?: string
): Promise<void> {
  await client.query(
    `INSERT INTO booking_logs (booking_id, from_status, to_status, changed_by, comment)
     VALUES ($1, $2, $3, $4, $5)`,
    [bookingId, fromStatus, toStatus, changedBy, comment ?? null]
  );
}

/**
 * Нормализует строку БД в BookingWithDetails
 */
function normalizeBookingRow(row: Record<string, unknown>): BookingWithDetails {
  return {
    id: String(row.id),
    status: String(row.status) as BookingStatus,
    tour: {
      id: String(row.tour_id ?? ''),
      title: String(row.tour_name ?? row.tour_title ?? 'Неизвестный тур'),
      price: Number(row.tour_price ?? 0),
    },
    tourist: {
      id: String(row.user_id ?? ''),
      name: String(row.user_name ?? ''),
      email: String(row.user_email ?? ''),
    },
    date: new Date(String(row.date ?? row.start_date ?? '')),
    participants: Number(row.participants ?? row.guests_count ?? 0),
    totalAmount: Number(row.total_price ?? 0),
    refundAmount: row.refund_amount != null ? Number(row.refund_amount) : null,
    cancelledAt: row.cancelled_at ? new Date(String(row.cancelled_at)) : null,
    cancelledBy: row.cancelled_by ? String(row.cancelled_by) : null,
    specialRequests: row.special_requests ? String(row.special_requests) : null,
    paymentStatus: String(row.payment_status ?? 'pending'),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    logs: [],
  };
}

function normalizeLogRow(row: Record<string, unknown>): BookingLogEntry {
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    fromStatus: String(row.from_status) as BookingStatus,
    toStatus: String(row.to_status) as BookingStatus,
    changedBy: String(row.changed_by),
    comment: row.comment ? String(row.comment) : null,
    createdAt: new Date(String(row.created_at)),
  };
}

// Базовый SELECT для бронирований с JOIN-ами на тур и пользователя
const BOOKING_SELECT = `
  SELECT
    b.*,
    t.name AS tour_name,
    t.price AS tour_price,
    u.name AS user_name,
    u.email AS user_email
  FROM bookings b
  LEFT JOIN tours t ON b.tour_id = t.id
  LEFT JOIN users u ON b.user_id = u.id
`;

// ========================================
// Публичный API сервиса
// ========================================

/**
 * Создать бронирование со статусом pending.
 * Проверяет: тур существует, достаточно мест.
 * Если передан departureId — валидирует заезд и использует его дату.
 */
export async function createBooking(
  userId: string,
  input: CreateBookingInput
): Promise<BookingWithDetails> {
  return transaction(async (client) => {
    // Проверяем тур
    const tourResult = await client.query(
      'SELECT id, name, price, max_group_size, is_active FROM tours WHERE id = $1',
      [input.tourId]
    );
    if (tourResult.rows.length === 0) {
      throw new Error('Тур не найден');
    }

    const tour = tourResult.rows[0];
    if (!tour.is_active) {
      throw new Error('Тур не активен');
    }

    let bookingDate = input.date;
    let pricePerPerson = Number(tour.price);
    let validatedDepartureId: string | null = null;

    if (input.departureId) {
      // Блокируем строку заезда на время транзакции чтобы избежать гонки
      const depResult = await client.query(
        `SELECT id, start_date, available_slots, booked_slots, price_override, status
         FROM tour_departures
         WHERE id = $1 AND tour_id = $2
         FOR UPDATE`,
        [input.departureId, input.tourId]
      );
      if (depResult.rows.length === 0) {
        throw new Error('Заезд не найден или не принадлежит этому туру');
      }
      const dep = depResult.rows[0];
      if (dep.status !== 'active') {
        throw new Error('Заезд недоступен для бронирования');
      }

      // Считаем все активные брони (pending + confirmed) — не только booked_slots
      // booked_slots инкрементируется при confirmBooking, но pending-брони
      // тоже занимают места чтобы избежать двойного бронирования
      const pendingResult = await client.query(
        `SELECT COALESCE(SUM(participants), 0) AS pending_count
         FROM bookings
         WHERE departure_id = $1 AND status IN ('pending', 'confirmed')`,
        [input.departureId]
      );
      const pendingCount = Number(pendingResult.rows[0].pending_count);
      // Берём максимум чтобы избежать ситуации когда booked_slots > sum pending/confirmed
      const effectiveBooked = Math.max(Number(dep.booked_slots), pendingCount);
      const spotsLeft = Number(dep.available_slots) - effectiveBooked;

      if (input.participants > spotsLeft) {
        throw new Error(`Недостаточно мест на заезде: свободно ${spotsLeft}, запрошено ${input.participants}`);
      }
      bookingDate = String(dep.start_date);
      if (dep.price_override != null) {
        pricePerPerson = Number(dep.price_override);
      }
      validatedDepartureId = input.departureId;
    } else {
      // Проверяем доступность мест на дату (legacy — без заезда)
      const availResult = await client.query(
        `SELECT COALESCE(SUM(participants), 0) AS booked
         FROM bookings
         WHERE tour_id = $1
           AND date = $2
           AND status IN ('pending', 'confirmed')`,
        [input.tourId, input.date]
      );
      const bookedCount = Number(availResult.rows[0].booked);
      if (bookedCount + input.participants > Number(tour.max_group_size)) {
        throw new Error('Недостаточно мест на выбранную дату');
      }
    }

    // Рассчитываем итоговую стоимость
    const totalPrice = pricePerPerson * input.participants;

    // Создаём бронирование
    const insertResult = await client.query(
      `INSERT INTO bookings
         (user_id, tour_id, departure_id, date, start_date, participants, guests_count,
          total_price, status, payment_status, special_requests, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4, $5, $5, $6, 'pending', 'pending', $7, NOW(), NOW())
       RETURNING *`,
      [userId, input.tourId, validatedDepartureId, bookingDate, input.participants, totalPrice, input.specialRequests ?? null]
    );

    const bookingRow = insertResult.rows[0];

    // Логируем создание
    await logStatusChange(
      client,
      bookingRow.id,
      'pending' as BookingStatus,
      'pending' as BookingStatus,
      userId,
      'Бронирование создано'
    );

    // Подтягиваем полные данные
    const fullResult = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1`,
      [bookingRow.id]
    );

    return normalizeBookingRow(fullResult.rows[0]);
  });
}

/**
 * Подтвердить бронирование: pending -> confirmed
 * Вызывается оператором или админом.
 */
export async function confirmBooking(
  bookingId: string,
  operatorId: string
): Promise<BookingWithDetails> {
  return transaction(async (client) => {
    const result = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1 FOR UPDATE`,
      [bookingId]
    );
    if (result.rows.length === 0) {
      throw new Error('Бронирование не найдено');
    }

    const rawRow = result.rows[0];
    const currentStatus = String(rawRow.status) as BookingStatus;

    validateTransition(currentStatus, 'confirmed');

    await client.query(
      `UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
      [bookingId]
    );

    // Обновляем счётчик занятых мест в заезде (если бронь привязана к tour_departures)
    await client.query(
      `UPDATE tour_departures
       SET booked_slots = booked_slots + b.participants
       FROM bookings b
       WHERE tour_departures.id = b.departure_id
         AND b.id = $1
         AND b.departure_id IS NOT NULL`,
      [bookingId]
    );

    await logStatusChange(client, bookingId, currentStatus, 'confirmed', operatorId, 'Бронирование подтверждено оператором');

    const updated = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1`,
      [bookingId]
    );
    const confirmed = normalizeBookingRow(updated.rows[0]);

    // Уведомить туриста (fire-and-forget, не блокирует транзакцию)
    void notifyBookingConfirmed(confirmed.tourist.id, {
      id: bookingId,
      tourName: confirmed.tour.title,
      date: confirmed.date instanceof Date ? confirmed.date.toISOString().slice(0, 10) : String(confirmed.date),
      participants: confirmed.participants,
      totalPrice: confirmed.totalAmount,
    });

    return confirmed;
  });
}

/**
 * Отменить бронирование.
 *
 * Логика зависит от роли:
 * - Турист отменяет: refund зависит от времени до тура
 *   > 48ч — 100%, 24-48ч — 50%, < 24ч — 0%
 * - Оператор отменяет: всегда 100% возврат
 *
 * Если refund > 0, статус сразу переходит в refunded.
 * Если refund = 0, статус остаётся cancelled_by_tourist.
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  role: 'tourist' | 'operator' | 'admin',
  reason?: string
): Promise<{ booking: BookingWithDetails; refund: RefundResult }> {
  return transaction(async (client) => {
    const result = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1 FOR UPDATE`,
      [bookingId]
    );
    if (result.rows.length === 0) {
      throw new Error('Бронирование не найдено');
    }

    const row = result.rows[0];
    const currentStatus = String(row.status) as BookingStatus;

    // Определяем целевой статус отмены
    const isOperatorCancel = role === 'operator' || role === 'admin';
    const cancelStatus: BookingStatus = isOperatorCancel
      ? 'cancelled_by_operator'
      : 'cancelled_by_tourist';

    validateTransition(currentStatus, cancelStatus);

    // Рассчитываем возврат
    const refund = calculateRefund(
      Number(row.total_price),
      new Date(String(row.date ?? row.start_date)),
      isOperatorCancel
    );

    // Определяем финальный статус
    // Оператор отменяет: всегда refunded
    // Турист отменяет: refunded если возврат > 0, иначе cancelled_by_tourist
    let finalStatus: BookingStatus = cancelStatus;
    if (refund.amount > 0) {
      finalStatus = 'refunded';
    }

    // Обновляем бронирование
    await client.query(
      `UPDATE bookings
       SET status = $2,
           refund_amount = $3,
           cancelled_at = NOW(),
           cancelled_by = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId, finalStatus, refund.amount, userId]
    );

    // Логируем переход отмены
    await logStatusChange(
      client,
      bookingId,
      currentStatus,
      cancelStatus,
      userId,
      reason ?? (isOperatorCancel ? 'Отменено оператором' : 'Отменено туристом')
    );

    // Если переходим в refunded, логируем и этот переход
    if (finalStatus === 'refunded' && (cancelStatus as BookingStatus) !== 'refunded') {
      await logStatusChange(
        client,
        bookingId,
        cancelStatus,
        'refunded',
        userId,
        `Возврат: ${refund.percent}% (${refund.amount} руб.) — ${refund.reason}`
      );
    }

    const updated = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1`,
      [bookingId]
    );
    const cancelled = normalizeBookingRow(updated.rows[0]);

    // Уведомить туриста (fire-and-forget)
    void notifyBookingCancelled(cancelled.tourist.id, {
      id: bookingId,
      tourName: cancelled.tour.title,
      date: cancelled.date instanceof Date ? cancelled.date.toISOString().slice(0, 10) : String(cancelled.date),
      participants: cancelled.participants,
      totalPrice: cancelled.totalAmount,
      refundAmount: refund.amount,
      refundPercent: refund.percent,
      refundReason: refund.reason,
    });

    return { booking: cancelled, refund };
  });
}

/**
 * Переброс бронирования на другой тур/дату
 * - Роль: оператор или админ
 * - Проверяет владение туром (для оператора)
 * - Проверяет доступность мест
 * - Пересчитывает цену и сбрасывает payment_status, если изменилась
 */
export async function rescheduleBooking(
  bookingId: string,
  actorId: string,
  role: 'operator' | 'admin',
  input: RescheduleBookingInput
): Promise<BookingWithDetails> {
  const targetDate = new Date(input.targetDate);
  if (Number.isNaN(targetDate.getTime())) {
    throw new Error('Некорректная дата для переброса');
  }

  return transaction(async (client) => {
    const bookingResult = await client.query(
      `SELECT b.*, t.operator_id AS tour_operator_id, t.max_group_size, t.price AS tour_price, t.name AS tour_name
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       WHERE b.id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      throw new Error('Бронирование не найдено');
    }

    const bookingRow = bookingResult.rows[0];
    const currentStatus = String(bookingRow.status) as BookingStatus;

    if (TERMINAL_STATUSES.has(currentStatus) || CANCELLED_STATUSES.has(currentStatus)) {
      throw new Error('Нельзя перебросить завершённое или отменённое бронирование');
    }

    const currentParticipants = Number(bookingRow.participants ?? bookingRow.guests_count ?? 0) || 0;
    const participants = input.participants ?? currentParticipants;
    if (participants < 1) {
      throw new Error('Количество участников должно быть не менее 1');
    }

    // Проверяем владение текущим туром оператором
    if (role === 'operator') {
      const ownsCurrent = await client.query(
        `SELECT 1 FROM tours t JOIN partners p ON t.operator_id = p.id WHERE t.id = $1 AND p.user_id = $2`,
        [bookingRow.tour_id, actorId]
      );

      if (ownsCurrent.rows.length === 0) {
        throw new Error('Недостаточно прав для переброса бронирования');
      }
    }

    // Получаем целевой тур
    const targetTourResult = await client.query(
      `SELECT id, operator_id, max_group_size, price, name, is_active FROM tours WHERE id = $1`,
      [input.targetTourId]
    );

    if (targetTourResult.rows.length === 0) {
      throw new Error('Целевой тур не найден');
    }

    const targetTour = targetTourResult.rows[0];

    if (!targetTour.is_active) {
      throw new Error('Целевой тур не активен');
    }

    // Проверяем владение целевым туром оператором
    if (role === 'operator') {
      const ownsTarget = await client.query(
        `SELECT 1 FROM partners p WHERE p.id = $1 AND p.user_id = $2`,
        [targetTour.operator_id, actorId]
      );

      if (ownsTarget.rows.length === 0) {
        throw new Error('Недостаточно прав для переброса бронирования');
      }
    }

    // Проверяем вместимость
    const bookedResult = await client.query(
      `SELECT COALESCE(SUM(participants), 0) AS booked
       FROM bookings
       WHERE tour_id = $1
         AND date = $2
         AND status IN ('pending','confirmed')
         AND id <> $3`,
      [targetTour.id, input.targetDate, bookingId]
    );

    const bookedCount = Number(bookedResult.rows[0].booked);
    if (bookedCount + participants > Number(targetTour.max_group_size)) {
      throw new Error('Недостаточно мест на выбранную дату');
    }

    const newTotalPrice = Number(targetTour.price) * participants;
    const oldTotalPrice = Number(bookingRow.total_price ?? 0);
    const nextPaymentStatus = newTotalPrice === oldTotalPrice
      ? String(bookingRow.payment_status ?? 'pending')
      : 'pending';

    const nextStatus = currentStatus;

    await client.query(
      `UPDATE bookings
       SET tour_id = $1,
           date = $2,
           start_date = $2,
           participants = $3,
           guests_count = $3,
           total_price = $4,
           payment_status = $5,
           status = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [targetTour.id, input.targetDate, participants, newTotalPrice, nextPaymentStatus, nextStatus, bookingId]
    );

    const comment = input.comment ?? `Переброс на тур "${targetTour.name}" (${input.targetDate}), участников: ${participants}`;

    await logStatusChange(client, bookingId, currentStatus, nextStatus, actorId, comment);

    const updated = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1`,
      [bookingId]
    );

    return normalizeBookingRow(updated.rows[0]);
  });
}

/**
 * Завершить бронирование: confirmed -> completed
 * Вызывается оператором или админом после проведения тура.
 */
export async function completeBooking(
  bookingId: string,
  operatorId: string
): Promise<BookingWithDetails> {
  return transaction(async (client) => {
    const result = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1 FOR UPDATE`,
      [bookingId]
    );
    if (result.rows.length === 0) {
      throw new Error('Бронирование не найдено');
    }

    const row = result.rows[0];
    const currentStatus = String(row.status) as BookingStatus;

    validateTransition(currentStatus, 'completed');

    await client.query(
      `UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [bookingId]
    );

    await logStatusChange(client, bookingId, currentStatus, 'completed', operatorId, 'Тур завершён');

    const updated = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1`,
      [bookingId]
    );
    return normalizeBookingRow(updated.rows[0]);
  });
}

/**
 * Расчёт суммы возврата при отмене.
 *
 * Правила:
 * - Оператор отменяет: всегда 100%
 * - Турист отменяет:
 *   > 48 часов до тура  -> 100%
 *   24-48 часов          -> 50%
 *   < 24 часов           -> 0%
 */
export function calculateRefund(
  totalPrice: number,
  tourDate: Date,
  isOperatorCancel: boolean
): RefundResult {
  if (isOperatorCancel) {
    return {
      percent: 100,
      amount: totalPrice,
      reason: 'Оператор отменил бронирование. Полный возврат.',
    };
  }

  const now = new Date();
  const hoursUntilTour = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilTour > 48) {
    return {
      percent: 100,
      amount: totalPrice,
      reason: 'Отмена более чем за 48 часов до тура. Полный возврат.',
    };
  }

  if (hoursUntilTour >= 24) {
    const amount = Math.floor(totalPrice * 0.5);
    return {
      percent: 50,
      amount,
      reason: 'Отмена за 24-48 часов до тура. Возврат 50%.',
    };
  }

  return {
    percent: 0,
    amount: 0,
    reason: 'Отмена менее чем за 24 часа до тура. Возврат не предусмотрен.',
  };
}

// ========================================
// Функции чтения (без транзакций)
// ========================================

/**
 * Получить бронирование по ID с деталями и логами
 */
export async function getBookingById(bookingId: string): Promise<BookingWithDetails | null> {
  const result = await query(
    `${BOOKING_SELECT} WHERE b.id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) {
    return null;
  }

  const booking = normalizeBookingRow(result.rows[0]);

  // Подтягиваем логи
  const logsResult = await query(
    `SELECT * FROM booking_logs WHERE booking_id = $1 ORDER BY created_at ASC`,
    [bookingId]
  );
  booking.logs = logsResult.rows.map(normalizeLogRow);

  return booking;
}

/**
 * Получить бронирование для конкретного пользователя (проверка владения)
 */
export async function getBookingForUser(
  bookingId: string,
  userId: string
): Promise<BookingWithDetails | null> {
  const result = await query(
    `${BOOKING_SELECT} WHERE b.id = $1 AND b.user_id = $2`,
    [bookingId, userId]
  );
  if (result.rows.length === 0) {
    return null;
  }

  const booking = normalizeBookingRow(result.rows[0]);

  const logsResult = await query(
    `SELECT * FROM booking_logs WHERE booking_id = $1 ORDER BY created_at ASC`,
    [bookingId]
  );
  booking.logs = logsResult.rows.map(normalizeLogRow);

  return booking;
}

/**
 * Подтвердить бронирование через оплату: pending -> confirmed
 * Вызывается при успешном завершении платежа (gateway webhook / verify).
 */
export async function confirmBookingPayment(
  bookingId: string,
  transactionId: string
): Promise<BookingWithDetails> {
  return transaction(async (client) => {
    const result = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1 FOR UPDATE`,
      [bookingId]
    );
    if (result.rows.length === 0) {
      throw new Error('Бронирование не найдено');
    }

    const booking = result.rows[0];
    const currentStatus = String(booking.status) as BookingStatus;

    validateTransition(currentStatus, 'confirmed');

    await client.query(
      `UPDATE bookings SET status = 'confirmed', payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
      [bookingId]
    );

    // Обновляем счётчик занятых мест в заезде (если бронь привязана к tour_departures)
    await client.query(
      `UPDATE tour_departures
       SET booked_slots = booked_slots + b.participants
       FROM bookings b
       WHERE tour_departures.id = b.departure_id
         AND b.id = $1
         AND b.departure_id IS NOT NULL`,
      [bookingId]
    );

    await logStatusChange(
      client,
      bookingId,
      currentStatus,
      'confirmed',
      bookingId,
      `Оплата подтверждена (транзакция ${transactionId})`
    );

    const updated = await client.query(
      `${BOOKING_SELECT} WHERE b.id = $1`,
      [bookingId]
    );
    return normalizeBookingRow(updated.rows[0]);
  });
}

/**
 * Список бронирований с фильтрацией по роли.
 *
 * - tourist: видит только свои бронирования
 * - operator: видит бронирования на свои туры
 * - admin: видит всё
 */
export async function listBookings(params: {
  userId: string;
  role: 'tourist' | 'operator' | 'admin';
  status?: string;
  limit: number;
  offset: number;
}): Promise<{ bookings: BookingWithDetails[]; total: number }> {
  const { userId, role, status, limit, offset } = params;

  let whereClause = '';
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  // Фильтрация по роли
  if (role === 'tourist') {
    whereClause = `WHERE b.user_id = $${paramIndex++}`;
    queryParams.push(userId);
  } else if (role === 'operator') {
    // Оператор видит бронирования на туры, где он — партнёр-оператор
    whereClause = `WHERE t.operator_id IN (SELECT id FROM partners WHERE user_id = $${paramIndex++})`;
    queryParams.push(userId);
  }
  // admin — без WHERE по user

  // Фильтрация по статусу
  if (status) {
    const statusConnector = whereClause ? 'AND' : 'WHERE';
    whereClause += ` ${statusConnector} b.status = $${paramIndex++}`;
    queryParams.push(status);
  }

  // Запрос данных
  const dataQuery = `
    ${BOOKING_SELECT}
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(limit, offset);

  const result = await query(dataQuery, queryParams as string[]);

  // Запрос общего количества
  const countParams: unknown[] = [];
  let countParamIndex = 1;
  let countWhere = '';

  if (role === 'tourist') {
    countWhere = `WHERE b.user_id = $${countParamIndex++}`;
    countParams.push(userId);
  } else if (role === 'operator') {
    countWhere = `WHERE t.operator_id IN (SELECT id FROM partners WHERE user_id = $${countParamIndex++})`;
    countParams.push(userId);
  }

  if (status) {
    const statusConnector = countWhere ? 'AND' : 'WHERE';
    countWhere += ` ${statusConnector} b.status = $${countParamIndex++}`;
    countParams.push(status);
  }

  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM bookings b
     LEFT JOIN tours t ON b.tour_id = t.id
     ${countWhere}`,
    countParams as string[]
  );

  const bookings = result.rows.map(normalizeBookingRow);

  return {
    bookings,
    total: Number(countResult.rows[0].total),
  };
}
