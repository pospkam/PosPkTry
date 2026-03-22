import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { z } from 'zod';
import { TransferBookingRequest, TransferBookingResponse } from '@/types/transfer';
import { TransferBooking } from '@/types/transfer';
import { config } from '@/lib/config';
import { smsService } from '@/lib/notifications/sms';
import { emailService } from '@/lib/notifications/email';
import { telegramService } from '@/lib/notifications/telegram';
import { transferPayments } from '@/lib/payments/transfer-payments';
import { matchingEngine } from '@/lib/transfers/matching';
import { createBookingWithLock } from '@/lib/transfers/booking';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const bookTransferSchema = z.object({
  scheduleId: z.string().uuid(),
  passengersCount: z.number().int().min(1).max(50),
  vehicleType: z.string().optional(),
  features: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  budgetMax: z.number().min(0).optional(),
  contactInfo: z.object({
    name: z.string().max(255).optional(),
    phone: z.string().min(1).max(30),
    email: z.string().email(),
  }),
  specialRequests: z.string().max(2000).optional(),
  fromCoordinates: z.record(z.unknown()).optional(),
  toCoordinates: z.record(z.unknown()).optional(),
  departureDate: z.string().optional(),
});

// POST /api/transfers/book - Бронирование трансфера (THREAD-SAFE)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const body: unknown = await request.json();
    const parsed = bookTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      }, { status: 400 });
    }

    const requestData = parsed.data as TransferBookingRequest;

    try {
      // 1. ИНТЕЛЛЕКТУАЛЬНОЕ СОПОСТАВЛЕНИЕ ВОДИТЕЛЕЙ
      const matchingCriteria = {
        vehicleType: requestData.vehicleType,
        capacity: requestData.passengersCount,
        features: requestData.features || [],
        languages: requestData.languages || ['ru'],
        maxDistance: 10000, // 10 км
        maxPrice: requestData.budgetMax || 10000,
        minRating: 4.0,
        workingHours: {
          start: '06:00',
          end: '23:00'
        }
      };

      const matchingResult = await matchingEngine.findBestDrivers(requestData, matchingCriteria);

      if (!matchingResult.success || matchingResult.drivers.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Не найдено подходящих водителей для данного маршрута'
        }, { status: 404 });
      }

      // Берем лучшего водителя
      const bestDriver = matchingResult.drivers[0];

      // Получаем информацию о расписании для выбранного водителя
      const scheduleQuery = `
        SELECT s.*, r.*, v.*, d.*, o.name as operator_name, o.phone as operator_phone, o.email as operator_email
        FROM transfer_schedules s
        JOIN transfer_routes r ON s.route_id = r.id
        JOIN transfer_vehicles v ON s.vehicle_id = v.id
        JOIN transfer_drivers d ON s.driver_id = d.id
        JOIN operators o ON v.operator_id = o.id
        WHERE s.id = $1 AND s.is_active = true AND d.id = $2
      `;

      const scheduleResult = await query(scheduleQuery, [requestData.scheduleId, bestDriver.driverId]);

      if (scheduleResult.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Расписание не найдено или водитель недоступен'
        }, { status: 404 });
      }

      const schedule = scheduleResult.rows[0];

      // 🔒 БЕЗОПАСНОЕ БРОНИРОВАНИЕ С ТРАНЗАКЦИОННЫМИ БЛОКИРОВКАМИ
      // Защита от race conditions и overbooking
      const bookingResult = await createBookingWithLock({
        scheduleId: requestData.scheduleId,
        passengersCount: requestData.passengersCount,
        userId,
        contactInfo: requestData.contactInfo,
        specialRequests: requestData.specialRequests
      });

      if (!bookingResult.success) {
        return NextResponse.json({
          success: false,
          error: bookingResult.error,
          errorCode: bookingResult.errorCode
        }, {
          status: bookingResult.errorCode === 'INSUFFICIENT_SEATS' ? 400 :
                 bookingResult.errorCode === 'LOCK_TIMEOUT' ? 409 : 500
        });
      }

      const booking = bookingResult.booking;

      // 2. СОЗДАНИЕ ПЛАТЕЖА
      const paymentRequest = {
        bookingId: booking.id,
        amount: parseFloat(booking.total_price),
        currency: 'RUB',
        paymentMethod: 'card' as const,
        customerInfo: {
          email: requestData.contactInfo.email,
          phone: requestData.contactInfo.phone,
          name: requestData.contactInfo.name || 'Не указано'
        },
        description: `Оплата трансфера ${booking.scheduleInfo.fromLocation} → ${booking.scheduleInfo.toLocation}`
      };

      const paymentResult = await transferPayments.createPayment(paymentRequest);

      if (!paymentResult.success) {
        // Откатываем бронирование при ошибке платежа
        // Импортируем функцию отмены
        const { cancelBooking } = await import('@/lib/transfers/booking');
        await cancelBooking(booking.id, 'Payment creation failed');

        return NextResponse.json({
          success: false,
          error: `Ошибка создания платежа: ${paymentResult.error}`
        }, { status: 500 });
      }

      // Места уже обновлены в createBookingWithLock
      // Уведомление уже создано в createBookingWithLock

      // Отправляем реальные уведомления
      await sendRealBookingNotifications(booking, schedule, schedule, requestData.contactInfo);

      const response: TransferBookingResponse = {
        success: true,
        data: {
          bookingId: booking.id,
          status: booking.status,
          confirmationCode: booking.confirmation_code,
          totalPrice: parseFloat(booking.total_price),
          bookingDetails: {
            id: booking.id,
            userId: booking.user_id,
            operatorId: booking.operator_id,
            routeId: booking.route_id,
            vehicleId: booking.vehicle_id,
            driverId: booking.driver_id,
            scheduleId: booking.schedule_id,
            bookingDate: booking.booking_date,
            departureTime: booking.departure_time,
            passengersCount: booking.passengers_count,
            totalPrice: parseFloat(booking.total_price),
            status: booking.status,
            specialRequests: booking.special_requests,
            contactPhone: booking.contact_phone,
            contactEmail: booking.contact_email,
            confirmationCode: booking.confirmation_code,
            createdAt: new Date(booking.created_at),
            updatedAt: new Date(booking.updated_at)
          }
        }
      };

      return NextResponse.json(response);

    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : 'Ошибка базы данных';
      return NextResponse.json({
        success: false,
        error: `Не удалось создать бронирование: ${msg}`
      }, { status: 503 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при создании бронирования'
    }, { status: 500 });
  }
}

// Функция для отправки реальных уведомлений
async function sendRealBookingNotifications(
  booking: Record<string, unknown>,
  schedule: Record<string, unknown>,
  driver: Record<string, unknown> | null,
  contactInfo: Record<string, unknown>
): Promise<void> {
  try {
    // Отправка SMS уведомления пассажиру
    if (contactInfo.phone) {
      await smsService.sendBookingConfirmation(contactInfo.phone as string, {
        confirmationCode: booking.confirmation_code as string,
        route: `${String(schedule.from_location)} → ${String(schedule.to_location)}`,
        date: schedule.departure_date as string,
        time: schedule.departure_time as string,
        driverName: driver?.name as string ?? '',
        driverPhone: driver?.phone as string ?? ''
      });
    }

    // Отправка Email уведомления пассажиру
    if (contactInfo.email) {
      await emailService.sendBookingConfirmation(contactInfo.email as string, {
        id: booking.id as string,
        confirmationCode: booking.confirmation_code as string,
        route: `${String(schedule.from_location)} → ${String(schedule.to_location)}`,
        date: schedule.departure_date as string,
        time: schedule.departure_time as string,
        passengers: booking.passengers_count as number,
        price: parseFloat(booking.total_price as string),
        driverName: driver?.name as string ?? '',
        driverPhone: driver?.phone as string ?? '',
        meetingPoint: schedule.meeting_point as string ?? 'Уточните у водителя'
      });
    }

    // Отправка Telegram уведомления водителю
    if (driver && driver.telegram_chat_id) {
      await telegramService.sendDriverNotification(driver.telegram_chat_id as string, {
        id: booking.id as string,
        route: `${String(schedule.from_location)} → ${String(schedule.to_location)}`,
        date: schedule.departure_date as string,
        time: schedule.departure_time as string,
        passengers: booking.passengers_count as number,
        price: parseFloat(booking.total_price as string),
        passengerName: contactInfo.name as string ?? 'Не указано',
        passengerPhone: contactInfo.phone as string,
        meetingPoint: schedule.meeting_point as string ?? 'Уточните у пассажира'
      });
    }


  } catch (error) {
    // Не прерываем выполнение при ошибке уведомлений
  }
}
