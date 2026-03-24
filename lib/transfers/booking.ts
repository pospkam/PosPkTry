/**
 * 🔒 БЕЗОПАСНОЕ БРОНИРОВАНИЕ ТРАНСФЕРОВ
 * 
 * Решает проблему race conditions с помощью:
 * 1. PostgreSQL транзакций
 * 2. SELECT FOR UPDATE NOWAIT блокировок
 * 3. Атомарных операций
 * 
 * @author Cursor AI Agent
 * @date 2025-10-30
 * @critical Критически важный модуль - не изменять без review!
 */

import { PoolClient } from 'pg';
import { transaction } from '@/lib/database';

export interface BookingRequest {
  scheduleId: string;
  passengersCount: number;
  userId: string;
  contactInfo: {
    phone: string;
    email: string;
    name?: string;
  };
  specialRequests?: string;
}

export interface BookingResult {
  success: boolean;
  booking?: any;
  error?: string;
  errorCode?: string;
}

/**
 * Создает бронирование с защитой от race conditions
 * 
 * Алгоритм:
 * 1. BEGIN transaction
 * 2. SELECT ... FOR UPDATE NOWAIT - блокировка расписания
 * 3. Проверка доступности мест
 * 4. UPDATE available_seats (атомарная операция)
 * 5. INSERT booking
 * 6. COMMIT
 * 
 * Если блокировка недоступна → возвращает ошибку немедленно (NOWAIT)
 */
export async function createBookingWithLock(
  request: BookingRequest
): Promise<BookingResult> {
  try {
    return await transaction(async (client: PoolClient) => {
      // 1. Блокируем расписание для чтения и обновления
      // FOR UPDATE NOWAIT - не ждем освобождения блокировки, возвращаем ошибку сразу
      const lockQuery = `
        SELECT 
          s.id,
          s.available_seats,
          s.price_per_person,
          s.route_id,
          s.vehicle_id,
          s.driver_id,
          s.departure_time,
          r.from_location,
          r.to_location,
          v.operator_id
        FROM transfer_schedules s
        JOIN transfer_routes r ON s.route_id = r.id
        JOIN transfer_vehicles v ON s.vehicle_id = v.id
        WHERE s.id = $1 AND s.is_active = true
        FOR UPDATE NOWAIT
      `;

      let scheduleResult;
      try {
        scheduleResult = await client.query(lockQuery, [request.scheduleId]);
      } catch (error: unknown) {
        // NOWAIT вернет ошибку если строка уже заблокирована
        if ((error as { code?: string }).code === '55P03') { // lock_not_available
          return {
            success: false,
            error: 'Это расписание сейчас бронируется другим пользователем. Попробуйте еще раз.',
            errorCode: 'LOCK_TIMEOUT'
          };
        }
        throw error;
      }

      if (scheduleResult.rows.length === 0) {
        return {
          success: false,
          error: 'Расписание не найдено или неактивно',
          errorCode: 'SCHEDULE_NOT_FOUND'
        };
      }

      const schedule = scheduleResult.rows[0];

      // 2. Проверяем доступность мест
      if (schedule.available_seats < request.passengersCount) {
        return {
          success: false,
          error: `Недостаточно свободных мест. Доступно: ${schedule.available_seats}, требуется: ${request.passengersCount}`,
          errorCode: 'INSUFFICIENT_SEATS'
        };
      }

      // 3. Атомарно уменьшаем количество мест
      // Используем WHERE условие для дополнительной защиты
      const updateSeatsQuery = `
        UPDATE transfer_schedules 
        SET 
          available_seats = available_seats - $1,
          updated_at = NOW()
        WHERE id = $2 
          AND available_seats >= $1
          AND is_active = true
        RETURNING available_seats
      `;

      const updateResult = await client.query(updateSeatsQuery, [
        request.passengersCount,
        request.scheduleId
      ]);

      if (updateResult.rowCount === 0) {
        // Это не должно произойти из-за блокировки, но проверяем на всякий случай
        return {
          success: false,
          error: 'Места были заняты другим пользователем',
          errorCode: 'SEATS_TAKEN'
        };
      }

      const newAvailableSeats = updateResult.rows[0].available_seats;

      // 4. Генерируем код подтверждения
      const confirmationCode = generateConfirmationCode();

      // 5. Вычисляем цену
      const totalPrice = parseFloat(schedule.price_per_person) * request.passengersCount;

      // 6. Создаем бронирование
      const bookingQuery = `
        INSERT INTO transfer_bookings (
          user_id,
          operator_id,
          route_id,
          vehicle_id,
          driver_id,
          schedule_id,
          booking_date,
          departure_time,
          passengers_count,
          total_price,
          status,
          special_requests,
          contact_phone,
          contact_email,
          confirmation_code,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          'pending', $11, $12, $13, $14, NOW(), NOW()
        )
        RETURNING *
      `;

      const bookingDate = new Date().toISOString().split('T')[0];

      const bookingResult = await client.query(bookingQuery, [
        request.userId,
        schedule.operator_id,
        schedule.route_id,
        schedule.vehicle_id,
        schedule.driver_id,
        request.scheduleId,
        bookingDate,
        schedule.departure_time,
        request.passengersCount,
        totalPrice,
        request.specialRequests || null,
        request.contactInfo.phone,
        request.contactInfo.email,
        confirmationCode
      ]);

      const booking = bookingResult.rows[0];

      // 7. Создаем уведомление в БД
      const notificationQuery = `
        INSERT INTO transfer_notifications (
          booking_id,
          user_id,
          operator_id,
          type,
          title,
          message,
          is_read,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      `;

      await client.query(notificationQuery, [
        booking.id,
        request.userId,
        schedule.operator_id,
        'booking_created',
        'Бронирование создано',
        `Ваше бронирование на ${schedule.departure_time} по маршруту ${schedule.from_location} → ${schedule.to_location} создано. Код: ${confirmationCode}`
      ]);

      // Транзакция успешно завершена, возвращаем результат
      return {
        success: true,
        booking: {
          ...booking,
          scheduleInfo: {
            fromLocation: schedule.from_location,
            toLocation: schedule.to_location,
            departureTime: schedule.departure_time,
            remainingSeats: newAvailableSeats
          }
        }
      };
    });

  } catch (error: unknown) {
    
    return {
      success: false,
      error: 'Внутренняя ошибка при создании бронирования',
      errorCode: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Временная блокировка мест (hold)
 * Используется когда пользователь находится на странице оплаты
 * 
 * Автоматически освобождается через timeout (15 минут)
 */
export async function holdSeats(
  scheduleId: string,
  passengersCount: number,
  userId: string,
  timeoutMinutes: number = 15
): Promise<BookingResult> {
  try {
    return await transaction(async (client: PoolClient) => {
      // Блокируем расписание
      const lockQuery = `
        SELECT available_seats
        FROM transfer_schedules
        WHERE id = $1 AND is_active = true
        FOR UPDATE NOWAIT
      `;

      let scheduleResult;
      try {
        scheduleResult = await client.query(lockQuery, [scheduleId]);
      } catch (error: unknown) {
        if ((error as { code?: string }).code === '55P03') {
          return {
            success: false,
            error: 'Расписание занято другим пользователем',
            errorCode: 'LOCK_TIMEOUT'
          };
        }
        throw error;
      }

      if (scheduleResult.rows.length === 0) {
        return {
          success: false,
          error: 'Расписание не найдено',
          errorCode: 'SCHEDULE_NOT_FOUND'
        };
      }

      const availableSeats = scheduleResult.rows[0].available_seats;

      if (availableSeats < passengersCount) {
        return {
          success: false,
          error: 'Недостаточно мест',
          errorCode: 'INSUFFICIENT_SEATS'
        };
      }

      // Создаем временную блокировку в таблице (нужно создать таблицу seat_holds)
      const holdQuery = `
        INSERT INTO seat_holds (
          schedule_id,
          user_id,
          seats_count,
          expires_at,
          created_at
        ) VALUES ($1, $2, $3, NOW() + INTERVAL '${timeoutMinutes} minutes', NOW())
        RETURNING *
      `;

      const holdResult = await client.query(holdQuery, [
        scheduleId,
        userId,
        passengersCount
      ]);

      return {
        success: true,
        booking: holdResult.rows[0]
      };
    });

  } catch (error: unknown) {
    return {
      success: false,
      error: 'Ошибка блокировки мест',
      errorCode: 'HOLD_ERROR'
    };
  }
}

/**
 * Освобождение временной блокировки
 */
export async function releaseHold(holdId: string): Promise<boolean> {
  try {
    return await transaction(async (client: PoolClient) => {
      const query = `
        DELETE FROM seat_holds
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, [holdId]);
      return (result.rowCount ?? 0) > 0;
    });
  } catch (error) {
    return false;
  }
}

/**
 * Очистка истекших блокировок (запускать по cron каждые 5 минут)
 */
export async function cleanupExpiredHolds(): Promise<number> {
  try {
    return await transaction(async (client: PoolClient) => {
      const query = `
        DELETE FROM seat_holds
        WHERE expires_at < NOW()
        RETURNING id
      `;

      const result = await client.query(query);
      return result.rowCount || 0;
    });
  } catch (error) {
    return 0;
  }
}

/**
 * Генерация уникального кода подтверждения
 */
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Проверка доступности мест без блокировки (для отображения в UI)
 */
export async function checkAvailability(
  scheduleId: string,
  passengersCount: number
): Promise<{
  available: boolean;
  seatsLeft: number;
}> {
  const { query } = await import('@/lib/database');
  
  try {
    const result = await query(
      `SELECT available_seats FROM transfer_schedules WHERE id = $1 AND is_active = true`,
      [scheduleId]
    );

    if (result.rows.length === 0) {
      return { available: false, seatsLeft: 0 };
    }

    const seatsLeft = result.rows[0].available_seats as number;
    return {
      available: seatsLeft >= passengersCount,
      seatsLeft
    };
  } catch (error) {
    return { available: false, seatsLeft: 0 };
  }
}

/**
 * Отмена бронирования с возвратом мест
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<BookingResult> {
  try {
    return await transaction(async (client: PoolClient) => {
      // Получаем информацию о бронировании
      const bookingQuery = `
        SELECT * FROM transfer_bookings
        WHERE id = $1 AND status IN ('pending', 'confirmed')
        FOR UPDATE
      `;

      const bookingResult = await client.query(bookingQuery, [bookingId]);

      if (bookingResult.rows.length === 0) {
        return {
          success: false,
          error: 'Бронирование не найдено или уже отменено',
          errorCode: 'BOOKING_NOT_FOUND'
        };
      }

      const booking = bookingResult.rows[0];

      // Возвращаем места в расписание
      const updateSeatsQuery = `
        UPDATE transfer_schedules
        SET 
          available_seats = available_seats + $1,
          updated_at = NOW()
        WHERE id = $2
      `;

      await client.query(updateSeatsQuery, [
        booking.passengers_count,
        booking.schedule_id
      ]);

      // Обновляем статус бронирования
      const cancelQuery = `
        UPDATE transfer_bookings
        SET 
          status = 'cancelled',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const cancelResult = await client.query(cancelQuery, [bookingId]);

      // Создаем уведомление об отмене
      const notificationQuery = `
        INSERT INTO transfer_notifications (
          booking_id,
          user_id,
          operator_id,
          type,
          title,
          message,
          created_at
        ) VALUES ($1, $2, $3, 'booking_cancelled', 'Бронирование отменено', $4, NOW())
      `;

      await client.query(notificationQuery, [
        bookingId,
        booking.user_id,
        booking.operator_id,
        reason || 'Бронирование отменено пользователем'
      ]);

      return {
        success: true,
        booking: cancelResult.rows[0]
      };
    });

  } catch (error) {
    return {
      success: false,
      error: 'Ошибка отмены бронирования',
      errorCode: 'CANCEL_ERROR'
    };
  }
}
