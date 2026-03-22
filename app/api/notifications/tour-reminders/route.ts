import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { emailService } from '@/lib/notifications/email-service';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const TourReminderSchema = z.object({
  tour_id: z.string().uuid('Укажите корректный ID тура'),
  reminder_type: z.enum(['email', 'sms', 'push'], { errorMap: () => ({ message: 'Укажите корректный тип напоминания: email, sms или push' }) }),
  send_days_before: z.number().int('Дни должны быть целым числом').min(1, 'Минимум 1 день').max(30, 'Максимум 30 дней').optional(),
});

/**
 * POST /api/notifications/tour-reminders
 * Отправка email напоминаний о предстоящих турах (за 24 часа)
 * Может вызываться по расписанию (cron job). Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    // Попытаемся распарсить body если он есть, но это не критично для этого endpoint
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Игнорируем ошибку парсинга - параметры не обязательны
    }

    // Валидируем если данные были отправлены
    if (Object.keys(body as Record<string, unknown>).length > 0) {
      const validationResult = TourReminderSchema.safeParse(body);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || 'Ошибка валидации';
        return NextResponse.json({
          success: false,
          error: errorMessage,
        }, { status: 400 });
      }
    }

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
        u.email as user_email,
        COALESCE(u.name, u.email) as user_name
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN partners p ON t.operator_id = p.id
      JOIN users u ON b.user_id = u.id
      WHERE DATE(b.start_date) = $1
        AND b.status = 'confirmed'
        AND b.payment_status = 'paid'
        AND u.email IS NOT NULL
      LIMIT 200
    `;

    const bookingsResult = await query<{ id: string; user_email: string; tour_name: string; start_date: string; guests_count: number; total_price: string; duration: number; operator_name: string; operator_phone: string | null; operator_email: string | null; user_name: string; }>(bookingsQuery, [tomorrowStr]);

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
    return NextResponse.json({
      success: false,
      error: 'Ошибка при отправке напоминаний',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

