import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/analytics/dashboard
 * Get comprehensive analytics dashboard for operator
 */
export async function GET(request: NextRequest) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const operatorId = await getOperatorPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();

    // Overview statistics
    const overviewResult = await query(
      `SELECT 
        COUNT(DISTINCT t.id) as total_tours,
        COUNT(DISTINCT CASE WHEN t.is_active THEN t.id END) as active_tours,
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.id END) as pending_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as confirmed_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) as cancelled_bookings,
        COALESCE(SUM(b.total_price), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END), 0) as paid_revenue,
        COALESCE(SUM(CASE WHEN b.payment_status = 'pending' THEN b.total_price ELSE 0 END), 0) as pending_revenue,
        COALESCE(AVG(CASE WHEN b.status != 'cancelled' THEN b.total_price END), 0) as avg_booking_value
      FROM tours t
      LEFT JOIN bookings b ON t.id = b.tour_id AND b.created_at >= $2
      WHERE t.operator_id = $1`,
      [operatorId, startDate]
    );

    const overview = overviewResult.rows[0];

    // Daily bookings trend (last 30 days)
    const trendResult = await query(
      `SELECT 
        DATE(b.created_at) as date,
        COUNT(*) as bookings_count,
        SUM(b.total_price) as revenue,
        COUNT(DISTINCT b.user_id) as unique_customers
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
      GROUP BY DATE(b.created_at)
      ORDER BY date ASC`,
      [operatorId, startDate]
    );

    // Top performing tours
    const topToursResult = await query(
      `SELECT 
        t.id,
        t.name,
        COUNT(b.id) as bookings_count,
        SUM(b.total_price) as revenue,
        AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating END) as avg_rating,
        COUNT(DISTINCT r.id) as reviews_count
      FROM tours t
      LEFT JOIN bookings b ON t.id = b.tour_id AND b.created_at >= $2 AND b.status != 'cancelled'
      LEFT JOIN reviews r ON t.id = r.tour_id
      WHERE t.operator_id = $1
      GROUP BY t.id, t.name
      ORDER BY bookings_count DESC, revenue DESC
      LIMIT 5`,
      [operatorId, startDate]
    );

    // Recent bookings
    const recentBookingsResult = await query(
      `SELECT 
        b.id,
        b.status,
        b.payment_status,
        b.total_price,
        b.created_at,
        b.start_date,
        b.guests_count,
        t.name as tour_name,
        u.name as customer_name,
        u.email as customer_email
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE t.operator_id = $1
      ORDER BY b.created_at DESC
      LIMIT 10`,
      [operatorId]
    );

    // Conversion metrics
    const conversionResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2`,
      [operatorId, startDate]
    );

    const conversion = conversionResult.rows[0];
    const totalConversion = parseInt(conversion.pending) + parseInt(conversion.confirmed) + 
                           parseInt(conversion.completed) + parseInt(conversion.cancelled);

    // Customer insights
    const customersResult = await query(
      `SELECT 
        COUNT(DISTINCT b.user_id) as total_customers,
        COUNT(DISTINCT CASE WHEN booking_count > 1 THEN user_id END) as repeat_customers
      FROM (
        SELECT 
          b.user_id,
          COUNT(*) as booking_count
        FROM bookings b
        JOIN tours t ON b.tour_id = t.id
        WHERE t.operator_id = $1
          AND b.created_at >= $2
          AND b.status != 'cancelled'
        GROUP BY b.user_id
      ) customer_bookings`,
      [operatorId, startDate]
    );

    const customers = customersResult.rows[0];

    // Reviews summary
    const reviewsResult = await query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        COUNT(*) FILTER (WHERE rating = 5) as five_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 1) as one_star,
        COUNT(*) FILTER (WHERE operator_reply IS NOT NULL) as replied_count
      FROM reviews r
      JOIN tours t ON r.tour_id = t.id
      WHERE t.operator_id = $1
        AND r.created_at >= $2`,
      [operatorId, startDate]
    );

    const reviews = reviewsResult.rows[0];

    const dashboard = {
      period: {
        days: parseInt(period),
        startDate,
        endDate: new Date().toISOString()
      },
      overview: {
        tours: {
          total: parseInt(overview.total_tours),
          active: parseInt(overview.active_tours)
        },
        bookings: {
          total: parseInt(overview.total_bookings),
          pending: parseInt(overview.pending_bookings),
          confirmed: parseInt(overview.confirmed_bookings),
          completed: parseInt(overview.completed_bookings),
          cancelled: parseInt(overview.cancelled_bookings)
        },
        revenue: {
          total: parseFloat(overview.total_revenue),
          paid: parseFloat(overview.paid_revenue),
          pending: parseFloat(overview.pending_revenue),
          avgBookingValue: parseFloat(overview.avg_booking_value)
        }
      },
      trend: trendResult.rows.map(row => ({
        date: row.date,
        bookingsCount: parseInt(row.bookings_count),
        revenue: parseFloat(row.revenue),
        uniqueCustomers: parseInt(row.unique_customers)
      })),
      topTours: topToursResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        bookingsCount: parseInt(row.bookings_count),
        revenue: parseFloat(row.revenue || 0),
        avgRating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(2) : null,
        reviewsCount: parseInt(row.reviews_count)
      })),
      recentBookings: recentBookingsResult.rows.map(row => ({
        id: row.id,
        status: row.status,
        paymentStatus: row.payment_status,
        totalPrice: parseFloat(row.total_price),
        tourName: row.tour_name,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        startDate: row.start_date,
        guestsCount: row.guests_count,
        createdAt: row.created_at
      })),
      conversion: {
        pending: parseInt(conversion.pending),
        confirmed: parseInt(conversion.confirmed),
        completed: parseInt(conversion.completed),
        cancelled: parseInt(conversion.cancelled),
        confirmationRate: totalConversion > 0 
          ? ((parseInt(conversion.confirmed) / totalConversion) * 100).toFixed(2)
          : '0.00',
        completionRate: parseInt(conversion.confirmed) > 0
          ? ((parseInt(conversion.completed) / parseInt(conversion.confirmed)) * 100).toFixed(2)
          : '0.00',
        cancellationRate: totalConversion > 0
          ? ((parseInt(conversion.cancelled) / totalConversion) * 100).toFixed(2)
          : '0.00'
      },
      customers: {
        total: parseInt(customers.total_customers),
        repeat: parseInt(customers.repeat_customers),
        repeatRate: parseInt(customers.total_customers) > 0
          ? ((parseInt(customers.repeat_customers) / parseInt(customers.total_customers)) * 100).toFixed(2)
          : '0.00'
      },
      reviews: {
        total: parseInt(reviews.total_reviews),
        avgRating: reviews.avg_rating ? parseFloat(reviews.avg_rating).toFixed(2) : '0.00',
        distribution: {
          5: parseInt(reviews.five_star),
          4: parseInt(reviews.four_star),
          3: parseInt(reviews.three_star),
          2: parseInt(reviews.two_star),
          1: parseInt(reviews.one_star)
        },
        repliedCount: parseInt(reviews.replied_count),
        replyRate: parseInt(reviews.total_reviews) > 0
          ? ((parseInt(reviews.replied_count) / parseInt(reviews.total_reviews)) * 100).toFixed(2)
          : '0.00'
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboard
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get operator analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении аналитики'
    } as ApiResponse<null>, { status: 500 });
  }
}
