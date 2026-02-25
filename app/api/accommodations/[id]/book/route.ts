/**
 * API endpoint для бронирования номера
 * POST /api/accommodations/[id]/book
 * 
 * Body:
 * - roomId: ID номера
 * - checkInDate: дата заезда (YYYY-MM-DD)
 * - checkOutDate: дата выезда (YYYY-MM-DD)
 * - adults: количество взрослых
 * - children: количество детей
 * - specialRequests: специальные пожелания (optional)
 * - guestNotes: заметки гостя (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { z } from 'zod';
import { emailService } from '@/lib/notifications/email-service';

// Валидация входных данных
const bookingSchema = z.object({
  roomId: z.string().uuid('Неверный ID номера'),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты'),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты'),
  adults: z.number().min(1, 'Минимум 1 взрослый').max(20, 'Максимум 20 взрослых'),
  children: z.number().min(0).max(10).optional().default(0),
  specialRequests: z.string().optional(),
  guestNotes: z.string().optional(),
});

export const dynamic = 'force-dynamic';

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accommodationId } = params;
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
      roomId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      specialRequests,
      guestNotes,
    } = validationResult.data;
    
    // Проверяем даты
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkIn < today) {
      return NextResponse.json(
        { success: false, error: 'Дата заезда не может быть в прошлом' },
        { status: 400 }
      );
    }
    
    if (checkOut <= checkIn) {
      return NextResponse.json(
        { success: false, error: 'Дата выезда должна быть после даты заезда' },
        { status: 400 }
      );
    }
    
    // Вычисляем количество ночей
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights > 365) {
      return NextResponse.json(
        { success: false, error: 'Максимальная длительность бронирования - 365 ночей' },
        { status: 400 }
      );
    }
    
    // Проверяем существование объекта и номера
    const roomCheckResult = await query(
      `SELECT 
        r.id,
        r.accommodation_id,
        r.name,
        r.max_guests,
        r.available_rooms,
        r.price_per_night,
        a.name as accommodation_name,
        a.is_active
      FROM accommodation_rooms r
      JOIN accommodations a ON r.accommodation_id = a.id
      WHERE r.id = $1 AND a.id = $2 AND r.is_active = true AND a.is_active = true`,
      [roomId, accommodationId]
    );
    
    if (roomCheckResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Номер не найден или недоступен' },
        { status: 404 }
      );
    }
    
    const room = roomCheckResult.rows[0];
    
    // Проверяем максимальное количество гостей
    const totalGuests = adults + children;
    if (totalGuests > room.max_guests) {
      return NextResponse.json(
        {
          success: false,
          error: `Превышено максимальное количество гостей (макс: ${room.max_guests})`,
        },
        { status: 400 }
      );
    }
    
    // Проверяем доступность на выбранные даты
    const availabilityCheck = await query(
      `SELECT COUNT(*) as bookings
       FROM accommodation_bookings
       WHERE room_id = $1
         AND status NOT IN ('cancelled')
         AND (
           (check_in_date <= $2 AND check_out_date > $2)
           OR (check_in_date < $3 AND check_out_date >= $3)
           OR (check_in_date >= $2 AND check_out_date <= $3)
         )`,
      [roomId, checkInDate, checkOutDate]
    );
    
    const existingBookings = parseInt(availabilityCheck.rows[0]?.bookings || '0');
    
    if (existingBookings >= room.available_rooms) {
      return NextResponse.json(
        {
          success: false,
          error: 'К сожалению, на выбранные даты нет свободных номеров',
        },
        { status: 409 }
      );
    }
    
    // Рассчитываем стоимость
    const pricePerNight = parseFloat(room.price_per_night);
    const totalPrice = pricePerNight * nights;
    
    // Получаем userId из заголовка (middleware должен установить)
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }
    
    // Создаём бронирование
    const bookingResult = await query(
      `INSERT INTO accommodation_bookings (
        user_id,
        accommodation_id,
        room_id,
        check_in_date,
        check_out_date,
        nights,
        adults,
        children,
        room_price_per_night,
        total_price,
        currency,
        status,
        payment_status,
        special_requests,
        guest_notes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING id`,
      [
        userId,
        accommodationId,
        roomId,
        checkInDate,
        checkOutDate,
        nights,
        adults,
        children,
        pricePerNight,
        totalPrice,
        'RUB',
        'pending', // статус
        'pending', // payment_status
        specialRequests || null,
        guestNotes || null,
      ]
    );
    
    const bookingId = bookingResult.rows[0].id;

    // Получаем email пользователя из базы
    const userResult = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
    const userEmail = userResult.rows[0]?.email || 'user@example.com';
    const userName = userResult.rows[0]?.name || 'Гость';

    // Отправляем email подтверждение бронирования
    try {
      await emailService.sendEmail({
        to: userEmail,
        subject: `Подтверждение бронирования: ${room.accommodation_name}`,
        html: `
          <h2>Ваше бронирование подтверждено!</h2>
          <p><strong>Объект:</strong> ${room.accommodation_name}</p>
          <p><strong>Номер:</strong> ${room.name}</p>
          <p><strong>Заезд:</strong> ${checkInDate}</p>
          <p><strong>Выезд:</strong> ${checkOutDate}</p>
          <p><strong>Гости:</strong> ${adults} взрослых, ${children} детей</p>
          <p><strong>Итого:</strong> ${totalPrice.toLocaleString('ru-RU')} ₽</p>
          <p><strong>ID бронирования:</strong> ${bookingId}</p>
          <p>Ожидайте дальнейших инструкций по оплате.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending booking confirmation email:', emailError);
      // Не прерываем выполнение при ошибке email
    }

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
          bookingType: 'accommodation',
          amount: totalPrice,
          currency: 'RUB',
          userId,
          userEmail,
          description: `Оплата размещения: ${room.accommodation_name}`,
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

    return NextResponse.json({
      success: true,
      message: 'Бронирование создано успешно!',
      data: {
        bookingId,
        accommodationName: room.accommodation_name,
        roomName: room.name,
        checkInDate,
        checkOutDate,
        nights,
        adults,
        children,
        priceBreakdown: {
          pricePerNight,
          nights,
          totalPrice,
          currency: 'RUB',
        },
        status: 'pending',
        paymentStatus: 'pending',
        paymentUrl: `/hub/stay/bookings/${bookingId}/payment`,
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


