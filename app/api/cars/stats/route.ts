import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getCarsPartnerId, getCarsStats } from '@/lib/auth/cars-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cars/stats - Get comprehensive statistics for cars partner
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await getCarsPartnerId(userOrResponse.id);
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Партнер не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    // Get basic stats
    const basicStats = await getCarsStats(partnerId);

    // Get revenue by period
    const revenueByPeriod = await query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as rentals_count,
        SUM(rental_cost) as revenue,
        AVG(total_days) as avg_days
       FROM car_rentals
       WHERE partner_id = $1
         AND payment_status = 'paid'
         AND created_at >= NOW() - INTERVAL '${parseInt(period)} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [partnerId]
    );

    // Get top performing cars
    const topCars = await query(
      `SELECT
        c.id,
        c.brand,
        c.model,
        c.year,
        c.category,
        c.license_plate,
        COUNT(cr.id) as rental_count,
        SUM(cr.rental_cost) as total_revenue,
        AVG(cr.total_days) as avg_rental_days,
        c.rating,
        c.review_count
       FROM cars c
       LEFT JOIN car_rentals cr ON cr.car_id = c.id AND cr.payment_status = 'paid'
       WHERE c.partner_id = $1
       GROUP BY c.id
       ORDER BY total_revenue DESC NULLS LAST
       LIMIT 10`,
      [partnerId]
    );

    // Get rental status distribution
    const statusDistribution = await query(
      `SELECT
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
       FROM car_rentals
       WHERE partner_id = $1
       GROUP BY status`,
      [partnerId]
    );

    // Get upcoming rentals
    const upcomingRentals = await query(
      `SELECT
        cr.id,
        cr.rental_number,
        cr.customer_name,
        cr.start_date,
        cr.end_date,
        cr.total_days,
        cr.total_amount,
        cr.status,
        c.brand,
        c.model,
        c.license_plate
       FROM car_rentals cr
       JOIN cars c ON cr.car_id = c.id
       WHERE cr.partner_id = $1
         AND cr.status = 'confirmed'
         AND cr.start_date >= CURRENT_DATE
       ORDER BY cr.start_date ASC
       LIMIT 10`,
      [partnerId]
    );

    // Get active rentals
    const activeRentals = await query(
      `SELECT
        cr.id,
        cr.rental_number,
        cr.customer_name,
        cr.start_date,
        cr.end_date,
        cr.pickup_datetime,
        cr.total_days,
        cr.total_amount,
        c.brand,
        c.model,
        c.license_plate
       FROM car_rentals cr
       JOIN cars c ON cr.car_id = c.id
       WHERE cr.partner_id = $1
         AND cr.status = 'active'
       ORDER BY cr.start_date ASC`,
      [partnerId]
    );

    // Get maintenance alerts
    const maintenanceAlerts = await query(
      `SELECT
        c.id,
        c.brand,
        c.model,
        c.license_plate,
        c.mileage,
        c.next_service_date,
        EXTRACT(DAY FROM c.next_service_date - CURRENT_DATE) as days_until_service
       FROM cars c
       WHERE c.partner_id = $1
         AND c.next_service_date IS NOT NULL
         AND c.next_service_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY c.next_service_date ASC`,
      [partnerId]
    );

    // Get category performance
    const categoryPerformance = await query(
      `SELECT
        c.category,
        COUNT(DISTINCT c.id) as car_count,
        COUNT(cr.id) as rental_count,
        SUM(cr.rental_cost) as total_revenue,
        AVG(c.rating) as avg_rating
       FROM cars c
       LEFT JOIN car_rentals cr ON cr.car_id = c.id AND cr.payment_status = 'paid'
       WHERE c.partner_id = $1
       GROUP BY c.category
       ORDER BY total_revenue DESC NULLS LAST`,
      [partnerId]
    );

    // Get recent reviews
    const recentReviews = await query(
      `SELECT
        cr.id,
        cr.rating,
        cr.comment,
        cr.created_at,
        c.brand,
        c.model,
        u.full_name as customer_name
       FROM car_reviews cr
       JOIN cars c ON cr.car_id = c.id
       LEFT JOIN users u ON cr.user_id = u.id
       WHERE c.partner_id = $1
         AND cr.is_public = TRUE
       ORDER BY cr.created_at DESC
       LIMIT 10`,
      [partnerId]
    );

    // Get damage reports
    const damageReports = await query(
      `SELECT
        cdr.id,
        cdr.damage_type,
        cdr.severity,
        cdr.description,
        cdr.repair_cost,
        cdr.status,
        cdr.reported_at,
        c.brand,
        c.model,
        c.license_plate,
        cr.rental_number
       FROM car_damage_reports cdr
       JOIN car_rentals cr ON cdr.rental_id = cr.id
       JOIN cars c ON cdr.car_id = c.id
       WHERE cr.partner_id = $1
         AND cdr.status != 'closed'
       ORDER BY cdr.reported_at DESC
       LIMIT 10`,
      [partnerId]
    );

    return NextResponse.json({
      success: true,
      data: {
        overview: basicStats,
        revenueByPeriod: revenueByPeriod.rows,
        topCars: topCars.rows,
        statusDistribution: statusDistribution.rows,
        upcomingRentals: upcomingRentals.rows,
        activeRentals: activeRentals.rows,
        maintenanceAlerts: maintenanceAlerts.rows,
        categoryPerformance: categoryPerformance.rows,
        recentReviews: recentReviews.rows,
        damageReports: damageReports.rows
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching cars stats:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении статистики' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
