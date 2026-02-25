import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/finance/payouts - Список выплат партнерам
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // all, pending, completed, failed
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause = '';
    if (status !== 'all') {
      whereClause = `WHERE status = '${status}'`;
    }

    const payoutsQuery = `
      SELECT
        p.id,
        p.partner_id,
        p.booking_id,
        p.amount,
        p.currency,
        p.status,
        p.created_at,
        p.completed_at,
        p.failure_reason,
        pt.name as partner_name,
        pt.email as partner_email,
        CASE
          WHEN b.id IS NOT NULL THEN 'tour'
          WHEN ab.id IS NOT NULL THEN 'accommodation'
          WHEN tb.id IS NOT NULL THEN 'transfer'
          ELSE 'unknown'
        END as booking_type,
        COALESCE(t.name, a.name, 'Трансфер') as service_name
      FROM payouts p
      JOIN partners pt ON p.partner_id = pt.id
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN tours t ON b.tour_id = t.id
      LEFT JOIN accommodation_bookings ab ON p.booking_id = ab.id
      LEFT JOIN accommodations a ON ab.accommodation_id = a.id
      LEFT JOIN transfer_bookings tb ON p.booking_id = tb.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `;

    const payoutsResult = await query(payoutsQuery);

    // Статистика выплат
    const statsQuery = `
      SELECT
        COUNT(*) as total_payouts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payouts,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payouts,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) as pending_amount
      FROM payouts
    `;

    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        payouts: payoutsResult.rows.map(row => ({
          id: row.id,
          partnerId: row.partner_id,
          partnerName: row.partner_name,
          partnerEmail: row.partner_email,
          bookingId: row.booking_id,
          bookingType: row.booking_type,
          serviceName: row.service_name,
          amount: parseFloat(row.amount),
          currency: row.currency,
          status: row.status,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          failureReason: row.failure_reason
        })),
        stats: {
          totalPayouts: parseInt(stats.total_payouts),
          completedPayouts: parseInt(stats.completed_payouts),
          pendingPayouts: parseInt(stats.pending_payouts),
          totalPaid: parseFloat(stats.total_paid),
          pendingAmount: parseFloat(stats.pending_amount)
        }
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении данных о выплатах'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/admin/finance/payouts - Создание выплаты партнеру
 */
export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const body = await request.json();
    const { partnerId, bookingId, amount, description } = body;

    if (!partnerId || !bookingId || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Необходимо указать partnerId, bookingId и amount'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем, что выплата еще не существует
    const existingPayoutQuery = `
      SELECT id FROM payouts
      WHERE partner_id = $1 AND booking_id = $2
    `;

    const existingResult = await query(existingPayoutQuery, [partnerId, bookingId]);

    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Выплата для этого бронирования уже существует'
      } as ApiResponse<null>, { status: 400 });
    }

    // Создаем выплату
    const createPayoutQuery = `
      INSERT INTO payouts (
        partner_id,
        booking_id,
        amount,
        currency,
        status,
        description,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, status, created_at
    `;

    const payoutResult = await query(createPayoutQuery, [
      partnerId,
      bookingId,
      amount,
      'RUB',
      'pending',
      description || 'Выплата комиссии'
    ]);

    const payout = payoutResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        payoutId: payout.id,
        status: payout.status,
        createdAt: payout.created_at
      },
      message: 'Выплата создана успешно'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error creating payout:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании выплаты'
    } as ApiResponse<null>, { status: 500 });
  }
}

