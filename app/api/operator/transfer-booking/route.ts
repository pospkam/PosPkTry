import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, transaction } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

const createTransferSchema = z.object({
  bookingId: z.string().uuid(),
  toOperatorPartnerId: z.string().uuid(),
  commissionPercent: z.number().min(0).max(100).default(10),
  note: z.string().max(2000).optional(),
});

const updateTransferSchema = z.object({
  transferId: z.string().uuid(),
  action: z.enum(['accept', 'reject', 'cancel']),
  targetTourId: z.string().uuid().optional(),
});

async function resolveOperatorContext(userId: string): Promise<{ partnerId: string | null }> {
  const partnerId = await getOperatorPartnerId(userId);
  return { partnerId };
}

export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction') || 'all';
    const status = searchParams.get('status') || 'all';
    const limitRaw = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

    const whereParts: string[] = [];
    const values: unknown[] = [];

    if (direction === 'incoming') {
      whereParts.push(`t.to_operator_user_id = $${values.length + 1}`);
      values.push(userOrResponse.userId);
    } else if (direction === 'outgoing') {
      whereParts.push(`t.from_operator_user_id = $${values.length + 1}`);
      values.push(userOrResponse.userId);
    } else {
      whereParts.push(`(t.to_operator_user_id = $${values.length + 1} OR t.from_operator_user_id = $${values.length + 2})`);
      values.push(userOrResponse.userId, userOrResponse.userId);
    }

    if (status !== 'all') {
      whereParts.push(`t.status = $${values.length + 1}`);
      values.push(status);
    }

    values.push(limit);

    const rows = await query<{
      id: string;
      booking_id: string;
      from_operator_partner_id: string;
      to_operator_partner_id: string;
      from_operator_user_id: string;
      to_operator_user_id: string;
      commission_percent: string;
      commission_amount: string;
      status: string;
      note: string | null;
      target_tour_id: string | null;
      responded_at: string | null;
      created_at: string;
      booking_total_price: string;
      booking_start_date: string | null;
      source_tour_name: string | null;
      target_tour_name: string | null;
      from_operator_name: string | null;
      to_operator_name: string | null;
    }>(
      `SELECT
         t.id,
         t.booking_id,
         t.from_operator_partner_id,
         t.to_operator_partner_id,
         t.from_operator_user_id,
         t.to_operator_user_id,
         t.commission_percent,
         t.commission_amount,
         t.status,
         t.note,
         t.target_tour_id,
         t.responded_at,
         t.created_at,
         b.total_price as booking_total_price,
         b.start_date as booking_start_date,
         source_tour.name as source_tour_name,
         target_tour.name as target_tour_name,
         from_partner.name as from_operator_name,
         to_partner.name as to_operator_name
       FROM operator_booking_transfers t
       JOIN bookings b ON b.id = t.booking_id
       LEFT JOIN tours source_tour ON source_tour.id = b.tour_id
       LEFT JOIN tours target_tour ON target_tour.id = t.target_tour_id
       LEFT JOIN partners from_partner ON from_partner.id = t.from_operator_partner_id
       LEFT JOIN partners to_partner ON to_partner.id = t.to_operator_partner_id
       WHERE ${whereParts.join(' AND ')}
       ORDER BY t.created_at DESC
       LIMIT $${values.length}`,
      values
    );

    return NextResponse.json({
      success: true,
      data: rows.rows.map(item => ({
        id: item.id,
        bookingId: item.booking_id,
        fromOperatorPartnerId: item.from_operator_partner_id,
        toOperatorPartnerId: item.to_operator_partner_id,
        fromOperatorUserId: item.from_operator_user_id,
        toOperatorUserId: item.to_operator_user_id,
        fromOperatorName: item.from_operator_name,
        toOperatorName: item.to_operator_name,
        sourceTourName: item.source_tour_name,
        targetTourId: item.target_tour_id,
        targetTourName: item.target_tour_name,
        bookingTotalPrice: parseFloat(item.booking_total_price) || 0,
        bookingStartDate: item.booking_start_date,
        commissionPercent: parseFloat(item.commission_percent) || 0,
        commissionAmount: parseFloat(item.commission_amount) || 0,
        status: item.status,
        note: item.note,
        respondedAt: item.responded_at,
        createdAt: item.created_at,
      })),
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('[TRANSFER_BOOKING_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfer bookings' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const context = await resolveOperatorContext(userOrResponse.userId);
    if (!context.partnerId) {
      return NextResponse.json(
        { success: false, error: 'Партнёрский профиль оператора не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const payload = createTransferSchema.parse(await request.json());

    if (payload.commissionPercent < 0 || payload.commissionPercent > 100) {
      return NextResponse.json(
        { success: false, error: 'Неверный процент комиссии' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const targetOperatorResult = await query<{
      id: string;
      user_id: string;
      category: string;
    }>(
      `SELECT id, user_id, category
       FROM partners
       WHERE id = $1
       LIMIT 1`,
      [payload.toOperatorPartnerId]
    );

    if (targetOperatorResult.rows.length === 0 || targetOperatorResult.rows[0].category !== 'operator') {
      return NextResponse.json(
        { success: false, error: 'Целевой оператор не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const targetOperator = targetOperatorResult.rows[0];
    if (targetOperator.user_id === userOrResponse.userId) {
      return NextResponse.json(
        { success: false, error: 'Нельзя отправить переброс самому себе' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const bookingOwnershipResult = await query<{
      id: string;
      total_price: string;
      status: string;
    }>(
      `SELECT b.id, b.total_price, b.status
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       WHERE b.id = $1 AND t.operator_id = $2
       LIMIT 1`,
      [payload.bookingId, context.partnerId]
    );

    if (bookingOwnershipResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Бронирование не найдено или недоступно' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const existingPending = await query<{ id: string }>(
      `SELECT id
       FROM operator_booking_transfers
       WHERE booking_id = $1 AND status = 'pending'
       LIMIT 1`,
      [payload.bookingId]
    );

    if (existingPending.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Для этого бронирования уже есть активный переброс' } as ApiResponse<null>,
        { status: 409 }
      );
    }

    const booking = bookingOwnershipResult.rows[0];
    const bookingTotalPrice = parseFloat(booking.total_price) || 0;
    const commissionAmount = Number(((bookingTotalPrice * payload.commissionPercent) / 100).toFixed(2));

    const inserted = await query<{
      id: string;
      status: string;
      created_at: string;
    }>(
      `INSERT INTO operator_booking_transfers (
         booking_id,
         from_operator_partner_id,
         to_operator_partner_id,
         from_operator_user_id,
         to_operator_user_id,
         commission_percent,
         commission_amount,
         status,
         note,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, NOW(), NOW())
       RETURNING id, status, created_at`,
      [
        payload.bookingId,
        context.partnerId,
        payload.toOperatorPartnerId,
        userOrResponse.userId,
        targetOperator.user_id,
        payload.commissionPercent,
        commissionAmount,
        payload.note || null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          transferId: inserted.rows[0].id,
          status: inserted.rows[0].status,
          commissionPercent: payload.commissionPercent,
          commissionAmount,
          createdAt: inserted.rows[0].created_at,
        },
      } as ApiResponse<unknown>,
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    console.error('[TRANSFER_BOOKING_POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transfer booking offer' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const context = await resolveOperatorContext(userOrResponse.userId);
    if (!context.partnerId) {
      return NextResponse.json(
        { success: false, error: 'Партнёрский профиль оператора не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const payload = updateTransferSchema.parse(await request.json());

    const transferResult = await query<{
      id: string;
      booking_id: string;
      from_operator_partner_id: string;
      to_operator_partner_id: string;
      from_operator_user_id: string;
      to_operator_user_id: string;
      status: string;
      commission_amount: string;
      commission_percent: string;
    }>(
      `SELECT
         id,
         booking_id,
         from_operator_partner_id,
         to_operator_partner_id,
         from_operator_user_id,
         to_operator_user_id,
         status,
         commission_amount,
         commission_percent
       FROM operator_booking_transfers
       WHERE id = $1
       LIMIT 1`,
      [payload.transferId]
    );

    if (transferResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Запрос на переброс не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const transfer = transferResult.rows[0];

    if (payload.action === 'cancel') {
      if (transfer.from_operator_user_id !== userOrResponse.userId || transfer.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Недостаточно прав для отмены переброса' } as ApiResponse<null>,
          { status: 403 }
        );
      }

      await query(
        `UPDATE operator_booking_transfers
         SET status = 'cancelled', responded_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [payload.transferId]
      );

      return NextResponse.json({
        success: true,
        data: { transferId: payload.transferId, status: 'cancelled' },
      } as ApiResponse<unknown>);
    }

    if (transfer.to_operator_user_id !== userOrResponse.userId || transfer.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав для обработки переброса' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    if (payload.action === 'reject') {
      await query(
        `UPDATE operator_booking_transfers
         SET status = 'rejected', responded_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [payload.transferId]
      );

      return NextResponse.json({
        success: true,
        data: { transferId: payload.transferId, status: 'rejected' },
      } as ApiResponse<unknown>);
    }

    if (!payload.targetTourId) {
      return NextResponse.json(
        { success: false, error: 'При принятии нужно указать targetTourId' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const targetTourResult = await query<{ id: string }>(
      `SELECT id
       FROM tours
       WHERE id = $1 AND operator_id = $2
       LIMIT 1`,
      [payload.targetTourId, context.partnerId]
    );

    if (targetTourResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Целевой тур не найден или не принадлежит оператору' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    await transaction(async client => {
      await client.query(
        `UPDATE operator_booking_transfers
         SET
           status = 'accepted',
           target_tour_id = $2,
           responded_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [payload.transferId, payload.targetTourId]
      );

      await client.query(
        `UPDATE bookings
         SET tour_id = $2, updated_at = NOW()
         WHERE id = $1`,
        [transfer.booking_id, payload.targetTourId]
      );

      await client.query(
        `UPDATE operator_booking_transfers
         SET status = 'cancelled', responded_at = NOW(), updated_at = NOW()
         WHERE booking_id = $1 AND id <> $2 AND status = 'pending'`,
        [transfer.booking_id, payload.transferId]
      );
    });

    return NextResponse.json({
      success: true,
      data: {
        transferId: payload.transferId,
        status: 'accepted',
        targetTourId: payload.targetTourId,
        commissionPercent: parseFloat(transfer.commission_percent) || 0,
        commissionAmount: parseFloat(transfer.commission_amount) || 0,
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    console.error('[TRANSFER_BOOKING_PATCH]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process transfer booking' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
