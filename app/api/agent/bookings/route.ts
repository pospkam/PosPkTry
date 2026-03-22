import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, AgentBooking, AgentBookingFormData } from '@/types';
import { requireAgent } from '@/lib/auth/middleware';
import { z } from 'zod';

const CreateAgentBookingSchema = z.object({
  clientId: z.string().min(1, 'ID клиента обязателен'),
  tourId: z.string().min(1, 'ID тура обязателен'),
  tourDate: z.string().min(1, 'Дата тура обязательна'),
  guestsCount: z.number({ coerce: true }).int().positive('Количество гостей должно быть положительным'),
  specialRequests: z.string().optional(),
  voucherCode: z.string().optional(),
  notes: z.string().optional(),
});

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
    const params: (string | number)[] = [agentId];

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
        t.title as tour_name,
        p.company_name as tour_operator,
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
      JOIN operator_tours t ON b.tour_id = t.id
      JOIN partners p ON t.operator_id = p.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);
    const bookingsResult = await query<{
      id: string; client_id: string; client_name: string; client_email: string;
      tour_id: string; tour_name: string; tour_operator: string;
      booking_date: unknown; tour_date: unknown; guests_count: unknown;
      total_price: string; agent_commission: string; commission_status: unknown;
      status: unknown; payment_status: unknown; notes: unknown;
      created_at: unknown; updated_at: unknown;
    }>(bookingsQuery, params);

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
    } as ApiResponse<unknown>);

  } catch (error) {
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

    const body = await request.json();
    const parsed = CreateAgentBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }
    const { clientId, tourId, tourDate, guestsCount, specialRequests, voucherCode, notes } = parsed.data;

    // Получаем информацию о туре
    const tourQuery = `
      SELECT t.id, t.title, t.base_price, p.company_name as operator_name, p.commission_current as commission_rate
      FROM operator_tours t
      JOIN partners p ON t.operator_id = p.id
      WHERE t.id = $1 AND t.is_published = true AND t.deleted_at IS NULL
    `;

    const tourResult = await query<{ base_price: string; commission_rate: string }>(tourQuery, [tourId]);
    if (tourResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const tour = tourResult.rows[0];

    // Рассчитываем стоимость
    let totalPrice = parseFloat(tour.base_price) * guestsCount;
    let discountAmount = 0;

    // Применяем промокод если указан (из таблицы promo_codes)
    if (voucherCode) {
      const promoResult = await query<{
        id: string; discount_type: string; discount_value: string;
      }>(
        `SELECT id, discount_type, discount_value FROM promo_codes
         WHERE code = $1 AND is_active = true
           AND (expires_at IS NULL OR expires_at >= NOW())
           AND (max_uses IS NULL OR current_uses < max_uses)`,
        [voucherCode]
      );
      if (promoResult.rows.length > 0) {
        const promo = promoResult.rows[0];
        if (promo.discount_type === 'percentage') {
          discountAmount = totalPrice * (parseFloat(promo.discount_value) / 100);
        } else {
          discountAmount = Math.min(parseFloat(promo.discount_value), totalPrice);
        }
        totalPrice = Math.max(0, totalPrice - discountAmount);
        await query(
          'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1',
          [promo.id]
        );
      }
    }

    // Комиссия агента: 10% от суммы тура (commission_current — это % от оператора, не агентский)
    const agentCommissionRate = 10; // % от суммы бронирования агенту
    const agentCommission = totalPrice * (agentCommissionRate / 100);

    // Создаем бронирование (id — UUID генерируется автоматически)
    const createBookingQuery = `
      INSERT INTO agent_bookings (
        agent_id, client_id, tour_id, tour_date, guests_count,
        total_price, agent_commission, commission_rate,
        special_requests, voucher_code, discount_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at
    `;

    const bookingResult = await query<{ id: string; created_at: unknown }>(createBookingQuery, [
      agentId, clientId, tourId, tourDate, guestsCount,
      totalPrice, agentCommission, agentCommissionRate,
      specialRequests || null, voucherCode || null, discountAmount, notes || null
    ]);

    const newBooking = bookingResult.rows[0];

    // 📌 Create agent_commissions record (was missing)
    await query(
      `INSERT INTO agent_commissions (agent_id, booking_id, amount, rate, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [agentId, newBooking.id, agentCommission, agentCommissionRate, 'pending']
    );

    // Обновляем статистику клиента
    await query(`
      UPDATE agent_clients
      SET total_bookings = total_bookings + 1,
          total_spent    = total_spent + $1,
          last_booking   = NOW(),
          updated_at     = NOW()
      WHERE id = $2
    `, [totalPrice, clientId]);

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
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании бронирования'
    } as ApiResponse<null>, { status: 500 });
  }
}
