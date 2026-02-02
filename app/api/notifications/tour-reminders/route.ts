import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';
import { emailService } from '@/lib/notifications/email-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/tour-reminders
 * Отправка email напоминаний о предстоящих турах (за 24 часа)
 * Может вызываться по расписанию (cron job)
 */
export async function POST(request: NextRequest) {
  try {
    // Находим все подтвержденные бронирования на завтра
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const bookingsQuery = `
      SELECT
        b.id,
        b.start_date,
        b.guests_count,
        b.total_price,
        t.name as tour_name,
        t.duration,
        p.name as operator_name,
        p.phone as operator_phone,
        p.email as operator_email,
        -- TODO: Добавить user email из users таблицы
        'user@example.com' as user_email,
        'Иван Иванов' as user_name
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN partners p ON t.operator_id = p.id
      WHERE DATE(b.start_date) = $1
        AND b.status = 'confirmed'
        AND b.payment_status = 'paid'
    `;

    const bookingsResult = await query(bookingsQuery, [tomorrowStr]);

    if (bookingsResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Нет бронирований для напоминаний',
        data: { sentCount: 0 }
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    // Отправляем напоминания для каждого бронирования
    for (const booking of bookingsResult.rows) {
      try {
        await emailService.sendEmail({
          to: booking.user_email,
          subject: `Напоминание о туре: ${booking.tour_name}`,
          html: `
            <h2>Напоминание о вашем туре!</h2>

            <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2e7d32; margin-top: 0;">${booking.tour_name}</h3>
              <p><strong>Дата и время:</strong> ${booking.start_date}</p>
              <p><strong>Длительность:</strong> ${booking.duration} часов</p>
              <p><strong>Участников:</strong> ${booking.guests_count}</p>
              <p><strong>Оператор:</strong> ${booking.operator_name}</p>
              <p><strong>Телефон оператора:</strong> ${booking.operator_phone}</p>
              <p><strong>Email оператора:</strong> ${booking.operator_email}</p>
            </div>

            <h3 style="color: #1976d2;">Что нужно взять с собой:</h3>
            <ul>
              <li>Паспорт или водительское удостоверение</li>
              <li>Удобную одежду и обувь</li>
              <li>Головной убор и солнцезащитные очки</li>
              <li>Воду и перекус (если требуется)</li>
              <li>Фотоаппарат (опционально)</li>
            </ul>

            <h3 style="color: #1976d2;">Важная информация:</h3>
            <ul>
              <li>Будьте готовы за 15 минут до времени сбора</li>
              <li>В случае опоздания свяжитесь с оператором</li>
              <li>При плохой погоде тур может быть перенесён</li>
              <li>Соблюдайте правила безопасности на маршруте</li>
            </ul>

            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <p><strong>Экстренные контакты:</strong></p>
              <p>МЧС: 112</p>
              <p>Оператор: ${booking.operator_phone}</p>
            </div>

            <p><em>Желаем незабываемого путешествия по Камчатке!</em></p>
          `
        });

        sentCount++;
      } catch (error) {
        console.error('Error sending reminder for booking:', booking.id, error);
        errors.push(`Booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Отправлено ${sentCount} напоминаний`,
      data: {
        sentCount,
        totalBookings: bookingsResult.rows.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error sending tour reminders:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при отправке напоминаний',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

