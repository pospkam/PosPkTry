import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/profile/settings
 * Get operator settings
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const result = await query(
      'SELECT * FROM operator_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      const createResult = await query(
        `INSERT INTO operator_settings (user_id) 
         VALUES ($1) 
         RETURNING *`,
        [userId]
      );
      
      const s = createResult.rows[0];
      return NextResponse.json({
        success: true,
        data: {
          autoConfirmBookings: s.auto_confirm_bookings,
          bookingLeadTime: s.booking_lead_time,
          cancellationPolicy: s.cancellation_policy,
          refundPolicy: s.refund_policy,
          minGroupSize: s.min_group_size,
          maxAdvanceBookingDays: s.max_advance_booking_days,
          timezone: s.timezone,
          currency: s.currency,
          commissionRate: parseFloat(s.commission_rate),
          settings: s.settings
        }
      } as ApiResponse<any>);
    }

    const s = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        autoConfirmBookings: s.auto_confirm_bookings,
        bookingLeadTime: s.booking_lead_time,
        cancellationPolicy: s.cancellation_policy,
        refundPolicy: s.refund_policy,
        minGroupSize: s.min_group_size,
        maxAdvanceBookingDays: s.max_advance_booking_days,
        timezone: s.timezone,
        currency: s.currency,
        commissionRate: parseFloat(s.commission_rate),
        settings: s.settings
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get operator settings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении настроек'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/operator/profile/settings
 * Update operator settings
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const body = await request.json();
    const {
      autoConfirmBookings,
      bookingLeadTime,
      cancellationPolicy,
      refundPolicy,
      minGroupSize,
      maxAdvanceBookingDays,
      timezone,
      currency,
      commissionRate,
      settings
    } = body;

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (autoConfirmBookings !== undefined) {
      updates.push(`auto_confirm_bookings = $${paramIndex++}`);
      values.push(autoConfirmBookings);
    }

    if (bookingLeadTime !== undefined) {
      updates.push(`booking_lead_time = $${paramIndex++}`);
      values.push(bookingLeadTime);
    }

    if (cancellationPolicy !== undefined) {
      updates.push(`cancellation_policy = $${paramIndex++}`);
      values.push(cancellationPolicy);
    }

    if (refundPolicy !== undefined) {
      updates.push(`refund_policy = $${paramIndex++}`);
      values.push(refundPolicy);
    }

    if (minGroupSize !== undefined) {
      updates.push(`min_group_size = $${paramIndex++}`);
      values.push(minGroupSize);
    }

    if (maxAdvanceBookingDays !== undefined) {
      updates.push(`max_advance_booking_days = $${paramIndex++}`);
      values.push(maxAdvanceBookingDays);
    }

    if (timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(timezone);
    }

    if (currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`);
      values.push(currency);
    }

    if (commissionRate !== undefined) {
      updates.push(`commission_rate = $${paramIndex++}`);
      values.push(commissionRate);
    }

    if (settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    values.push(userId);

    const result = await query(
      `INSERT INTO operator_settings (user_id, ${updates.map((_, i) => updates[i].split(' = ')[0]).join(', ')})
       VALUES ($${paramIndex}, ${values.slice(0, -1).map((_, i) => `$${i + 1}`).join(', ')})
       ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}
       RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Настройки успешно обновлены'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update operator settings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении настроек'
    } as ApiResponse<null>, { status: 500 });
  }
}
