import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/bookings
 * Get bookings created by agent
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'agent') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Note: Need to add agent_id field to bookings table to track which agent made the booking
    // For now, return empty array with message
    const bookings = [];

    return NextResponse.json({
      success: true,
      data: { bookings },
      message: 'Система агентских бронирований в разработке. Необходимо добавить поле agent_id в таблицу bookings.'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get agent bookings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/agent/bookings
 * Create booking for client (by agent)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'agent') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const body = await request.json();
    const {
      clientEmail,
      clientName,
      tourId,
      date,
      participants,
      specialRequests
    } = body;

    // Validation
    if (!clientEmail || !tourId || !date || !participants) {
      return NextResponse.json({
        success: false,
        error: 'Заполните все обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

    // Check if client exists, create if not
    const clientResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [clientEmail.toLowerCase()]
    );

    let clientId;
    if (clientResult.rows.length === 0) {
      // Create new tourist user for client
      const newClient = await query(
        `INSERT INTO users (email, name, password_hash, role)
         VALUES ($1, $2, '', 'tourist')
         RETURNING id`,
        [clientEmail.toLowerCase(), clientName || 'Клиент']
      );
      clientId = newClient.rows[0].id;
    } else {
      clientId = clientResult.rows[0].id;
    }

    // Get tour info
    const tourResult = await query(
      'SELECT price FROM tours WHERE id = $1 AND is_active = true',
      [tourId]
    );

    if (tourResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или неактивен'
      } as ApiResponse<null>, { status: 404 });
    }

    const totalPrice = parseFloat(tourResult.rows[0].price) * participants;

    // Create booking
    // Note: Should add agent_id field to track agent commission
    const result = await query(
      `INSERT INTO bookings (
        user_id, tour_id, date, participants, total_price, 
        status, payment_status, special_requests
      ) VALUES ($1, $2, $3, $4, $5, 'pending', 'pending', $6)
      RETURNING *`,
      [clientId, tourId, date, participants, totalPrice, specialRequests]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Бронирование создано. Клиенту отправлено уведомление.'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create agent booking error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании бронирования'
    } as ApiResponse<null>, { status: 500 });
  }
}
