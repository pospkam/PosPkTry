/**
 * API endpoint для бронирования тура
 * POST /api/tours/[id]/book
 *
 * Body:
 * - date: дата тура (YYYY-MM-DD)
 * - adults: количество взрослых
 * - children: количество детей
 * - specialRequirements: специальные пожелания (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { z } from 'zod';
import { emailService } from '@/lib/notifications/email-service';

// Валидация входных данных
const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты'),
  adults: z.number().min(1, 'Минимум 1 взрослый').max(50, 'Максимум 50 взрослых'),
  children: z.number().min(0).max(20).optional().default(0),
  specialRequirements: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: tourId } = params;
    const body = await request.json();

    // Валидация
    const validationResult = bookingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ошибка валидации',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      date,
      adults,
      children,
      specialRequirements,
    } = validationResult.data;

    const totalParticipants = adults + children;

    // Проверяем существование тура
    const tourCheckResult = await query(
      `SELECT
        t.id,
        t.name,
        t.price,
        t.max_group_size,
        t.min_group_size,
        t.is_active,
        p.name as operator_name,
        p.email as operator_email
      FROM tours t
      JOIN partners p ON t.operator_id = p.id
      WHERE t.id = $1 AND t.is_active = true`,
      [tourId]
    );

    if (tourCheckResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Тур не найден или недоступен' },
        { status: 404 }
      );
    }

    const tour = tourCheckResult.rows[0];

    // Проверяем минимальное и максимальное количество участников
    if (totalParticipants < tour.min_group_size) {
      return NextResponse.json(
        {
          success: false,
          error: `Минимум участников: ${tour.min_group_size}`,
        },
        { status: 400 }
      );
    }

    if (totalParticipants > tour.max_group_size) {
      return NextResponse.json(
        {
          success: false,
          error: `Максимум участников: ${tour.max_group_size}`,
        },
        { status: 400 }
      );
    }

    // Проверяем доступность на выбранную дату
    const availabilityCheck = await query(
      `SELECT COUNT(*) as bookings
       FROM bookings
       WHERE tour_id = $1
         AND DATE(start_date) = $2
         AND status NOT IN ('cancelled')`,
      [tourId, date]
    );

    const existingBookings = parseInt(availabilityCheck.rows[0]?.bookings || '0');
    const availableSpots = tour.max_group_size - existingBookings;

    if (totalParticipants > availableSpots) {
      return NextResponse.json(
        {
          success: false,
          error: `Недостаточно мест. Доступно: ${availableSpots}`,
        },
        { status: 409 }
      );
    }

    // Рассчитываем стоимость
    const adultPrice = parseFloat(tour.price);
    const childPrice = adultPrice * 0.5; // Дети со скидкой 50%
    const totalPrice = (adults * adultPrice) + (children * childPrice);

    // Получаем userId из заголовка (middleware должен установить)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }

    // Создаем бронирование
    const bookingResult = await query(
      `INSERT INTO bookings (
        user_id,
        tour_id,
        start_date,
        end_date,
        guests_count,
        total_price,
        currency,
        status,
        payment_status,
        special_requests,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id`,
      [
        userId,
        tourId,
        date,
        date, // Для однодневных туров start_date = end_date
        totalParticipants,
        totalPrice,
        'RUB',
        'pending', // статус
        'pending', // payment_status
        specialRequirements || null,
      ]
    );

    const bookingId = bookingResult.rows[0].id;

    // Получаем email пользователя
    const userResult = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
    const userEmail = userResult.rows[0]?.email || 'user@example.com';
    const userName = userResult.rows[0]?.name || 'Гость';

    // Создаем платеж через CloudPayments
    let paymentData = null;
    try {
      const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          bookingId,
          bookingType: 'tour',
          amount: totalPrice,
          currency: 'RUB',
          userId,
          userEmail,
          description: `Оплата тура: ${tour.name}`,
        }),
      });

      if (paymentResponse.ok) {
        const paymentResult = await paymentResponse.json();
        if (paymentResult.success) {
          paymentData = paymentResult.data;
        }
      }
    } catch (paymentError) {
      console.error('Error creating payment:', paymentError);
      // Не прерываем выполнение при ошибке платежа
    }

    // Отправляем email подтверждение бронирования
    try {
      await emailService.sendEmail({
        to: userEmail,
        subject: `Подтверждение бронирования: ${tour.name}`,
        html: `
          <h2>Ваше бронирование подтверждено!</h2>
          <p><strong>Тур:</strong> ${tour.name}</p>
          <p><strong>Оператор:</strong> ${tour.operator_name}</p>
          <p><strong>Дата:</strong> ${date}</p>
          <p><strong>Участники:</strong> ${adults} взрослых, ${children} детей</p>
          <p><strong>Итого:</strong> ${totalPrice.toLocaleString('ru-RU')} ₽</p>
          <p><strong>ID бронирования:</strong> ${bookingId}</p>
          <p>Ожидайте дальнейших инструкций по оплате.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending booking confirmation email:', emailError);
      // Не прерываем выполнение при ошибке email
    }

    return NextResponse.json({
      success: true,
      message: 'Бронирование создано успешно!',
      data: {
        bookingId,
        tourName: tour.name,
        operatorName: tour.operator_name,
        date,
        adults,
        children,
        totalParticipants,
        priceBreakdown: {
          adultPrice,
          childPrice,
          totalPrice,
          currency: 'RUB',
        },
        status: 'pending',
        paymentStatus: 'pending',
        paymentUrl: `/hub/tours/bookings/${bookingId}/payment`,
        payment: paymentData ? {
          paymentId: paymentData.paymentId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          description: paymentData.description,
          invoiceId: paymentData.invoiceId,
        } : null,
      },
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка при создании бронирования',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
