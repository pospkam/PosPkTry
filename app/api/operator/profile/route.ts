import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getPartnerByUserId, ensurePartnerExists } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/profile
 * Get operator profile
 */
export async function GET(request: NextRequest) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    // Get user data
    const userResult = await query(
      'SELECT id, email, name, role, preferences, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const user = userResult.rows[0];

    // Get or create partner profile
    let partner = await getPartnerByUserId(userId, 'operator');
    
    if (!partner) {
      // Auto-create partner profile
      await ensurePartnerExists(userId, user.name, user.email, 'operator');
      partner = await getPartnerByUserId(userId, 'operator');
    }

    // Get operator settings
    const settingsResult = await query(
      'SELECT * FROM operator_settings WHERE user_id = $1',
      [userId]
    );

    let settings = null;
    if (settingsResult.rows.length > 0) {
      const s = settingsResult.rows[0];
      settings = {
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
      };
    }

    // Get statistics
    const statsResult = await query(
      `SELECT 
        COUNT(DISTINCT t.id) as total_tours,
        COUNT(DISTINCT CASE WHEN t.is_active THEN t.id END) as active_tours,
        COUNT(DISTINCT b.id) as total_bookings,
        COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as total_reviews
      FROM partners p
      LEFT JOIN tours t ON p.id = t.operator_id
      LEFT JOIN bookings b ON t.id = b.tour_id
      LEFT JOIN reviews r ON t.id = r.tour_id
      WHERE p.user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];

    const profile = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferences: user.preferences,
        createdAt: user.created_at
      },
      partner: partner,
      settings: settings,
      statistics: {
        totalTours: parseInt(stats.total_tours || 0),
        activeTours: parseInt(stats.active_tours || 0),
        totalBookings: parseInt(stats.total_bookings || 0),
        totalRevenue: parseFloat(stats.total_revenue || 0),
        avgRating: parseFloat(stats.avg_rating || 0).toFixed(2),
        totalReviews: parseInt(stats.total_reviews || 0)
      }
    };

    return NextResponse.json({
      success: true,
      data: profile
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get operator profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении профиля'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/operator/profile
 * Update operator profile
 */
export async function PUT(request: NextRequest) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const body = await request.json();
    const { name, description, contact, preferences } = body;

    // Update user name and preferences if provided
    if (name || preferences) {
      const userUpdates = [];
      const userValues = [];
      let paramIndex = 1;

      if (name) {
        userUpdates.push(`name = $${paramIndex++}`);
        userValues.push(name);
      }

      if (preferences) {
        userUpdates.push(`preferences = $${paramIndex++}`);
        userValues.push(JSON.stringify(preferences));
      }

      if (userUpdates.length > 0) {
        userValues.push(userId);
        await query(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${paramIndex}`,
          userValues
        );
      }
    }

    // Update partner profile
    const partner = await getPartnerByUserId(userId, 'operator');
    
    if (partner && (description || contact)) {
      const partnerUpdates = [];
      const partnerValues = [];
      let paramIndex = 1;

      if (description) {
        partnerUpdates.push(`description = $${paramIndex++}`);
        partnerValues.push(description);
      }

      if (contact) {
        partnerUpdates.push(`contact = $${paramIndex++}`);
        partnerValues.push(JSON.stringify(contact));
      }

      if (partnerUpdates.length > 0) {
        partnerValues.push(partner.id);
        await query(
          `UPDATE partners SET ${partnerUpdates.join(', ')} WHERE id = $${paramIndex}`,
          partnerValues
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Профиль успешно обновлен'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Update operator profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении профиля'
    } as ApiResponse<null>, { status: 500 });
  }
}
