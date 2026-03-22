/**
 * GET  /api/hub/operator/bookings — List bookings (paginated)
 * POST /api/hub/operator/bookings — Create booking (manual entry by operator)
 * Auth: operator role
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { PaginationSchema } from '@/lib/api/operator-tours';
import { notifyNewBooking } from '@/lib/notifications/operator-booking';
import { query } from '@/lib/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateBookingSchema = z.object({
  operator_tour_id: z.number().positive(),
  booking_date: z.string().date(),
  participants: z.number().int().positive().max(100),
  adult_count: z.number().int().nonnegative().optional(),
  child_count: z.number().int().nonnegative().optional(),
  tourist_name: z.string().max(255).optional(),
  tourist_phone: z.string().max(20).optional(),
  tourist_email: z.string().email().max(255).optional(),
  final_price: z.number().nonnegative().optional(),
  payment_method: z.enum(['cloudpayments', 'bank_transfer', 'cash']).optional(),
  payment_status: z.enum(['pending', 'paid']).default('pending'),
  booking_status: z.enum(['new', 'confirmed']).default('new'),
  special_requests: z.string().max(1000).optional(),
  created_via: z.enum(['website', 'direct_contact', 'api']).default('direct_contact'),
});

async function getOperatorRow(userId: string) {
  const result = await query(
    `SELECT p.id, p.name,
            p.contacts->>'telegram_chat_id' as telegram_chat_id
     FROM partners p WHERE p.user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function GET(request: NextRequest) {
  try {
    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const operator = await getOperatorRow(authOrResponse.userId);
    if (!operator) {
      return NextResponse.json({ error: 'Not an operator' }, { status: 403 });
    }
    const operator_id = operator.id as string;

    const { searchParams } = new URL(request.url);
    const pagination = PaginationSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    const status = searchParams.get('status');
    const payment = searchParams.get('payment');
    const tour_id = searchParams.get('tour_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    const conditions: string[] = ['t.operator_id = $1', 'b.deleted_at IS NULL'];
    const params: unknown[] = [operator_id];
    let idx = 2;

    if (status) { conditions.push(`b.booking_status = $${idx++}`); params.push(status); }
    if (payment) { conditions.push(`b.payment_status = $${idx++}`); params.push(payment); }
    if (tour_id) { conditions.push(`b.operator_tour_id = $${idx++}`); params.push(BigInt(tour_id)); }
    if (date_from) { conditions.push(`b.booking_date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`b.booking_date <= $${idx++}`); params.push(date_to); }

    const where = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      query(
        `SELECT
          b.id, b.operator_tour_id, t.title as tour_title,
          b.tourist_name, b.tourist_email, b.tourist_phone,
          b.booking_date, b.participants,
          b.final_price, b.currency,
          b.payment_status, b.booking_status,
          b.weather_alert_triggered, b.created_at
        FROM operator_bookings b
        JOIN operator_tours t ON b.operator_tour_id = t.id
        WHERE ${where}
        ORDER BY b.booking_date DESC, b.created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, pagination.limit, pagination.offset]
      ),
      query(
        `SELECT COUNT(*) FROM operator_bookings b
         JOIN operator_tours t ON b.operator_tour_id = t.id
         WHERE ${where}`,
        params
      ),
    ]);

    const total = parseInt(String(countResult.rows[0]?.count ?? '0'), 10);

    return NextResponse.json({
      success: true,
      data: rows.rows,
      pagination: {
        total,
        limit: pagination.limit,
        offset: pagination.offset,
        has_more: pagination.offset + rows.rows.length < total,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const operator = await getOperatorRow(authOrResponse.userId);
    if (!operator) {
      return NextResponse.json({ error: 'Not an operator' }, { status: 403 });
    }
    const operator_id = operator.id as string;
    const operator_name = operator.name as string;
    const telegram_chat_id = operator.telegram_chat_id as string | undefined;

    const body = await request.json();
    const input = CreateBookingSchema.parse(body);
    const tourId = BigInt(input.operator_tour_id);

    // Verify tour belongs to this operator
    const tourResult = await query(
      `SELECT id, title, base_price FROM operator_tours
       WHERE id = $1 AND operator_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [tourId, operator_id]
    );
    if (tourResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }
    const tour = tourResult.rows[0];
    const tourTitle = tour.title as string;
    const basePrice = Number(tour.base_price);
    const finalPrice = input.final_price ?? basePrice * input.participants;

    const result = await query(
      `INSERT INTO operator_bookings (
        operator_tour_id, tourist_name, tourist_phone, tourist_email,
        booking_date, participants, adult_count, child_count,
        base_total_price, final_price,
        payment_status, payment_method, booking_status,
        special_requests, created_via
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id, booking_date, participants, final_price, booking_status`,
      [
        tourId,
        input.tourist_name || null,
        input.tourist_phone || null,
        input.tourist_email || null,
        input.booking_date,
        input.participants,
        input.adult_count || null,
        input.child_count || null,
        basePrice * input.participants,
        finalPrice,
        input.payment_status,
        input.payment_method || null,
        input.booking_status,
        input.special_requests || null,
        input.created_via,
      ]
    );

    const booking = result.rows[0];

    // Fire-and-forget Telegram notification
    notifyNewBooking({
      booking_id: booking.id as bigint,
      tour_title: tourTitle,
      tourist_name: input.tourist_name,
      tourist_phone: input.tourist_phone,
      tourist_email: input.tourist_email,
      booking_date: input.booking_date,
      participants: input.participants,
      final_price: finalPrice,
      operator_name,
      operator_telegram_chat_id: telegram_chat_id,
      via: input.created_via,
    }).catch(() => undefined);

    return NextResponse.json(
      { success: true, data: booking, message: 'Booking created' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
