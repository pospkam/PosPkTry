import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/reviews/stats
 * Get detailed reviews statistics for operator
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

    // Overall statistics
    const overallResult = await query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        COUNT(*) FILTER (WHERE rating = 5) as five_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 1) as one_star,
        COUNT(*) FILTER (WHERE operator_reply IS NOT NULL) as replied,
        COUNT(*) FILTER (WHERE operator_reply IS NULL) as pending_reply,
        COUNT(*) FILTER (WHERE is_verified = true) as verified,
        COUNT(*) FILTER (WHERE created_at >= $2) as recent_reviews
      FROM reviews r
      JOIN tours t ON r.tour_id = t.id
      WHERE t.operator_id = $1`,
      [operatorId, startDate]
    );

    const overall = overallResult.rows[0];

    // Reviews by tour
    const byTourResult = await query(
      `SELECT 
        t.id,
        t.name,
        COUNT(r.id) as reviews_count,
        AVG(r.rating) as avg_rating,
        COUNT(*) FILTER (WHERE r.created_at >= $2) as recent_count
      FROM tours t
      LEFT JOIN reviews r ON t.id = r.tour_id
      WHERE t.operator_id = $1
      GROUP BY t.id, t.name
      HAVING COUNT(r.id) > 0
      ORDER BY reviews_count DESC
      LIMIT 10`,
      [operatorId, startDate]
    );

    // Reviews trend (last 30 days)
    const trendResult = await query(
      `SELECT 
        DATE(r.created_at) as date,
        COUNT(*) as reviews_count,
        AVG(r.rating) as avg_rating
      FROM reviews r
      JOIN tours t ON r.tour_id = t.id
      WHERE t.operator_id = $1
        AND r.created_at >= $2
      GROUP BY DATE(r.created_at)
      ORDER BY date ASC`,
      [operatorId, startDate]
    );

    // Recent negative reviews (rating <= 3, no reply)
    const negativeResult = await query(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        t.id as tour_id,
        t.name as tour_name,
        u.name as user_name
      FROM reviews r
      JOIN tours t ON r.tour_id = t.id
      JOIN users u ON r.user_id = u.id
      WHERE t.operator_id = $1
        AND r.rating <= 3
        AND r.operator_reply IS NULL
      ORDER BY r.created_at DESC
      LIMIT 5`,
      [operatorId]
    );

    // Response time analysis
    const responseTimeResult = await query(
      `SELECT 
        AVG(EXTRACT(EPOCH FROM (operator_reply_at - created_at))/3600) as avg_response_hours,
        MIN(EXTRACT(EPOCH FROM (operator_reply_at - created_at))/3600) as min_response_hours,
        MAX(EXTRACT(EPOCH FROM (operator_reply_at - created_at))/3600) as max_response_hours
      FROM reviews r
      JOIN tours t ON r.tour_id = t.id
      WHERE t.operator_id = $1
        AND operator_reply_at IS NOT NULL
        AND created_at >= $2`,
      [operatorId, startDate]
    );

    const responseTime = responseTimeResult.rows[0];

    const stats = {
      period: {
        days: parseInt(period),
        startDate,
        endDate: new Date().toISOString()
      },
      overall: {
        totalReviews: parseInt(overall.total_reviews),
        recentReviews: parseInt(overall.recent_reviews),
        avgRating: overall.avg_rating ? parseFloat(overall.avg_rating).toFixed(2) : '0.00',
        distribution: {
          5: parseInt(overall.five_star),
          4: parseInt(overall.four_star),
          3: parseInt(overall.three_star),
          2: parseInt(overall.two_star),
          1: parseInt(overall.one_star)
        },
        replied: parseInt(overall.replied),
        pendingReply: parseInt(overall.pending_reply),
        verified: parseInt(overall.verified),
        replyRate: parseInt(overall.total_reviews) > 0
          ? ((parseInt(overall.replied) / parseInt(overall.total_reviews)) * 100).toFixed(2)
          : '0.00'
      },
      byTour: byTourResult.rows.map(row => ({
        tourId: row.id,
        tourName: row.name,
        reviewsCount: parseInt(row.reviews_count),
        avgRating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(2) : '0.00',
        recentCount: parseInt(row.recent_count)
      })),
      trend: trendResult.rows.map(row => ({
        date: row.date,
        reviewsCount: parseInt(row.reviews_count),
        avgRating: parseFloat(row.avg_rating).toFixed(2)
      })),
      negativeReviews: negativeResult.rows.map(row => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        tourId: row.tour_id,
        tourName: row.tour_name,
        userName: row.user_name,
        createdAt: row.created_at
      })),
      responseTime: {
        avgHours: responseTime.avg_response_hours ? parseFloat(responseTime.avg_response_hours).toFixed(1) : null,
        minHours: responseTime.min_response_hours ? parseFloat(responseTime.min_response_hours).toFixed(1) : null,
        maxHours: responseTime.max_response_hours ? parseFloat(responseTime.max_response_hours).toFixed(1) : null
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get reviews stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики отзывов'
    } as ApiResponse<null>, { status: 500 });
  }
}
