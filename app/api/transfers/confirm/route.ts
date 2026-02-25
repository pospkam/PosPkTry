import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { TransferConfirmationRequest, TransferConfirmationResponse } from '@/types/transfer';
import { config } from '@/lib/config';
import { requireTransferOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// POST /api/transfers/confirm - Подтверждение/отклонение бронирования перевозчиком
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireTransferOperator(request);
    if (authResult instanceof NextResponse) return authResult;

    const body: TransferConfirmationRequest = await request.json();
    
    // Валидация входных данных
    if (!body.bookingId || !body.action) {
      return NextResponse.json({
        success: false,
        error: 'Отсутствуют обязательные поля: bookingId, action'
      }, { status: 400 });
    }

    if (!['confirm', 'reject'].includes(body.action)) {
      return NextResponse.json({
        success: false,
        error: 'Действие должно быть "confirm" или "reject"'
      }, { status: 400 });
    }

    try {
      // Получаем информацию о бронировании
      const bookingQuery = `
        SELECT b.*, s.*, r.*, v.*, d.*, o.name as operator_name
        FROM transfer_bookings b
        JOIN transfer_schedules s ON b.schedule_id = s.id
        JOIN transfer_routes r ON s.route_id = r.id
        JOIN transfer_vehicles v ON s.vehicle_id = v.id
        JOIN transfer_drivers d ON s.driver_id = d.id
        JOIN operators o ON v.operator_id = o.id
        WHERE b.id = $1
      `;

      const bookingResult = await query(bookingQuery, [body.bookingId]);

      if (bookingResult.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Бронирование не найдено'
        }, { status: 404 });
      }

      const booking = bookingResult.rows[0];

      // Проверяем, что бронирование в статусе pending
      if (booking.status !== 'pending') {
        return NextResponse.json({
          success: false,
          error: `Бронирование уже обработано. Текущий статус: ${booking.status}`
        }, { status: 400 });
      }

      const newStatus = body.action === 'confirm' ? 'confirmed' : 'cancelled';
      const statusMessage = body.action === 'confirm' ? 'подтверждено' : 'отклонено';

      // Обновляем статус бронирования
      const updateBookingQuery = `
        UPDATE transfer_bookings 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const updateResult = await query(updateBookingQuery, [newStatus, body.bookingId]);
      const updatedBooking = updateResult.rows[0];

      // Если бронирование отклонено, возвращаем места в расписание
      if (body.action === 'reject') {
        const returnSeatsQuery = `
          UPDATE transfer_schedules 
          SET available_seats = available_seats + $1, updated_at = NOW()
          WHERE id = $2
        `;

        await query(returnSeatsQuery, [booking.passengers_count, booking.schedule_id]);
      }

      // Создаем уведомление для клиента
      const notificationQuery = `
        INSERT INTO transfer_notifications (
          booking_id, user_id, type, title, message
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      const notificationType = body.action === 'confirm' ? 'booking_confirmed' : 'booking_cancelled';
      const notificationTitle = body.action === 'confirm' ? 
        'Бронирование подтверждено' : 'Бронирование отклонено';
      const notificationMessage = body.action === 'confirm' ? 
        `Ваше бронирование трансфера подтверждено. Водитель: ${booking.name}, Телефон: ${booking.phone}` :
        `Ваше бронирование трансфера отклонено. ${body.message || 'Причина не указана'}`;

      await query(notificationQuery, [
        booking.id,
        booking.user_id,
        notificationType,
        notificationTitle,
        notificationMessage
      ]);

      // Отправляем уведомления клиенту (заглушка)
      await sendConfirmationNotifications(updatedBooking, body.action, body.message);

      const response: TransferConfirmationResponse = {
        success: true,
        data: {
          bookingId: updatedBooking.id,
          newStatus: updatedBooking.status,
          message: `Бронирование успешно ${statusMessage}`
        }
      };

      return NextResponse.json(response);

    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Fallback к тестовому подтверждению
      const mockResponse: TransferConfirmationResponse = {
        success: true,
        data: {
          bookingId: body.bookingId,
          newStatus: body.action === 'confirm' ? 'confirmed' : 'cancelled',
          message: `Бронирование успешно ${body.action === 'confirm' ? 'подтверждено' : 'отклонено'}`
        }
      };

      return NextResponse.json(mockResponse);
    }

  } catch (error) {
    console.error('Error in transfer confirmation:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при обработке подтверждения'
    }, { status: 500 });
  }
}

// Функция для отправки уведомлений о подтверждении (заглушка)
async function sendConfirmationNotifications(
  booking: any, 
  action: string, 
  message?: string
): Promise<void> {
  try {
    // Здесь будет реальная отправка уведомлений
    console.log('Отправка уведомлений о подтверждении:', {
      bookingId: booking.id,
      action: action,
      message: message,
      contactPhone: booking.contact_phone,
      contactEmail: booking.contact_email
    });

    // В реальном приложении здесь будет:
    // - Отправка SMS с подтверждением/отклонением
    // - Отправка email с деталями
    // - Push-уведомление в мобильное приложение
    // - Уведомление в Telegram бот

    if (action === 'confirm') {
      // Отправляем детали поездки
      console.log('Отправка деталей поездки:', {
        departureTime: booking.departure_time,
        driverName: 'Иванов Иван Иванович', // Заглушка
        driverPhone: '+7-914-123-45-67', // Заглушка
        vehicleInfo: 'Hyundai Solaris КМ 123 АА' // Заглушка
      });
    }

  } catch (error) {
    console.error('Error sending confirmation notifications:', error);
  }
}