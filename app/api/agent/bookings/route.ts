import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { ApiResponse, AgentBooking, AgentBookingFormData } from '@/types';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/bookings - Получить бронирования агента
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const agentId = userOrResponse.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause = 'WHERE b.agent_id = $1';
    const params = [agentId];

    if (status !== 'all') {
      whereClause += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    if (clientId) {
      whereClause += ` AND b.client_id = $${params.length + 1}`;
      params.push(clientId);
    }

    const bookingsQuery = `
      SELECT
        b.id,
        b.client_id,
        c.name as client_name,
        c.email as client_email,
        b.tour_id,
        t.name as tour_name,
        p.name as tour_operator,
        b.booking_date,
        b.tour_date,
        b.guests_count,
        b.total_price,
        b.agent_commission,
        b.commission_status,
        b.status,
        b.payment_status,
        b.notes,
        b.created_at,
        b.updated_at
      FROM agent_bookings b
      JOIN agent_clients c ON b.client_id = c.id
      JOIN tours t ON b.tour_id = t.id
      JOIN partners p ON t.operator_id = p.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);
    const bookingsResult = await query(bookingsQuery, params);

    const bookings: AgentBooking[] = bookingsResult.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      tourId: row.tour_id,
      tourName: row.tour_name,
      tourOperator: row.tour_operator,
      bookingDate: row.booking_date,
      tourDate: row.tour_date,
      guestsCount: row.guests_count,
      totalPrice: parseFloat(row.total_price),
      agentCommission: parseFloat(row.agent_commission),
      commissionStatus: row.commission_status,
      status: row.status,
      paymentStatus: row.payment_status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        total: bookings.length
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching agent bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/agent/bookings - Создать бронирование через агента
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const agentId = userOrResponse.userId;

    const body: AgentBookingFormData = await request.json();
    const { clientId, tourId, tourDate, guestsCount, specialRequests, voucherCode, notes } = body;

    if (!clientId || !tourId || !tourDate || !guestsCount) {
      return NextResponse.json({
        success: false,
        error: 'Необходимо указать клиента, тур, дату и количество гостей'
      } as ApiResponse<null>, { status: 400 });
    }

    // Получаем информацию о туре
    const tourQuery = `
      SELECT t.*, p.name as operator_name, p.commission_rate
      FROM tours t
      JOIN partners p ON t.operator_id = p.id
      WHERE t.id = $1
    `;

    const tourResult = await query(tourQuery, [tourId]);
    if (tourResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const tour = tourResult.rows[0];

    // Проверяем доступность тура на указанную дату
    // TODO: Добавить проверку доступности

    // Рассчитываем стоимость
    let totalPrice = tour.price * guestsCount;
    let discountAmount = 0;

    // Применяем ваучер если указан
    if (voucherCode) {
      const voucherQuery = `
        SELECT * FROM vouchers
        WHERE code = $1 AND is_active = true
          AND valid_from <= NOW() AND valid_to >= NOW()
          AND (usage_limit IS NULL OR used_count < usage_limit)
      `;

      const voucherResult = await query(voucherQuery, [voucherCode]);
      if (voucherResult.rows.length > 0) {
        const voucher = voucherResult.rows[0];
        if (voucher.discountType === 'percentage') {
          discountAmount = totalPrice * (voucher.discountValue / 100);
        } else {
          discountAmount = Math.min(voucher.discountValue, totalPrice);
        }

        if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
          discountAmount = voucher.maxDiscount;
        }

        totalPrice -= discountAmount;

        // Обновляем счетчик использований ваучера
        await query(
          'UPDATE vouchers SET used_count = used_count + 1 WHERE id = $1',
          [voucher.id]
        );

        // Записываем использование ваучера
        await query(`
          INSERT INTO voucher_usage (
            id, voucher_id, voucher_code, booking_id, client_id,
            original_price, discount_amount, final_price, used_at
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          voucher.id, voucherCode, 'temp-booking-id', clientId,
          totalPrice + discountAmount, discountAmount, totalPrice
        ]);
      }
    }

    // Рассчитываем комиссию агента (стандартная ставка 10%, или индивидуальная из настроек)
    const agentCommissionRate = tour.commission_rate || 0.10; // Из настроек партнера или 10%
    const agentCommission = totalPrice * agentCommissionRate;

    // Создаем бронирование
    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const createBookingQuery = `
      INSERT INTO agent_bookings (
        id,
        agent_id,
        client_id,
        tour_id,
        booking_date,
        tour_date,
        guests_count,
        total_price,
        agent_commission,
        commission_status,
        status,
        payment_status,
        special_requests,
        voucher_code,
        discount_amount,
        notes,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
      RETURNING id, created_at
    `;

    const bookingResult = await query(createBookingQuery, [
      bookingId,
      agentId,
      clientId,
      tourId,
      tourDate,
      guestsCount,
      totalPrice,
      agentCommission,
      'pending', // commission_status
      'pending', // status
      'pending', // payment_status
      specialRequests || null,
      voucherCode || null,
      discountAmount,
      notes || null
    ]);

    // Обновляем статистику клиента
    await query(`
      UPDATE agent_clients
      SET total_bookings = total_bookings + 1,
          total_spent = total_spent + $1,
          last_booking = NOW(),
          updated_at = NOW()
      WHERE id = $2
    `, [totalPrice, clientId]);

    // Обновляем использование ваучера с реальным booking_id
    if (voucherCode) {
      await query(
        'UPDATE voucher_usage SET booking_id = $1 WHERE booking_id = $2',
        [bookingId, 'temp-booking-id']
      );
    }

    const newBooking = bookingResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        bookingId: newBooking.id,
        totalPrice,
        agentCommission,
        discountAmount,
        createdAt: newBooking.created_at
      },
      message: 'Бронирование успешно создано'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error creating agent booking:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании бронирования'
    } as ApiResponse<null>, { status: 500 });
  }
}
