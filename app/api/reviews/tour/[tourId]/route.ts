import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/tour/[tourId] - Public
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    const { tourId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const rating = searchParams.get('rating');
    const sortBy = searchParams.get('sortBy') || 'recent'; // recent, rating_high, rating_low
    const offset = (page - 1) * limit;

    // Build query
    let queryStr = `
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.is_verified,
        r.operator_reply,
        r.operator_reply_at,
        r.created_at,
        u.name as user_name,
        u.id as user_id,
        COALESCE(array_agg(DISTINCT a.url) FILTER (WHERE a.url IS NOT NULL), '{}') as photos
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN review_assets ra ON r.id = ra.review_id
      LEFT JOIN assets a ON ra.asset_id = a.id
      WHERE r.tour_id = $1
    `;

    const sqlParams: unknown[] = [tourId];
    let paramIndex = 2;

    // Rating filter
    if (rating) {
      queryStr += ` AND r.rating = $${paramIndex}`;
      sqlParams.push(parseInt(rating));
      paramIndex++;
    }

    queryStr += ` GROUP BY r.id, u.id, u.name`;

    // Sorting
    switch (sortBy) {
      case 'rating_high':
        queryStr += ` ORDER BY r.rating DESC, r.created_at DESC`;
        break;
      case 'rating_low':
        queryStr += ` ORDER BY r.rating ASC, r.created_at DESC`;
        break;
      default:
        queryStr += ` ORDER BY r.created_at DESC`;
    }

    queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    sqlParams.push(limit, offset);

    const result = await query(queryStr, sqlParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM reviews WHERE tour_id = $1';
    const countParams: unknown[] = [tourId];
    
    if (rating) {
      countQuery += ' AND rating = $2';
      countParams.push(parseInt(rating));
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get rating summary
    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        COUNT(*) FILTER (WHERE rating = 5) as five_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 1) as one_star
      FROM reviews
      WHERE tour_id = $1`,
      [tourId]
    );

    const summary = summaryResult.rows[0];

    const reviews = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      rating: row.rating,
      comment: row.comment,
      isVerified: row.is_verified,
      operatorReply: row.operator_reply,
      operatorReplyAt: row.operator_reply_at,
      photos: row.photos,
      createdAt: row.created_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        summary: {
          totalReviews: parseInt(summary.total_reviews),
          avgRating: summary.avg_rating ? parseFloat(summary.avg_rating).toFixed(2) : '0.00',
          distribution: {
            5: parseInt(summary.five_star),
            4: parseInt(summary.four_star),
            3: parseInt(summary.three_star),
            2: parseInt(summary.two_star),
            1: parseInt(summary.one_star)
          }
        },
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get tour reviews error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении отзывов'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/reviews/tour/[tourId] - Create a review for a tour (auth required)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const { tourId } = await params;
    const body = await request.json();
    const { rating, comment } = body;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Рейтинг должен быть от 1 до 5'
      } as ApiResponse<null>, { status: 400 });
    }

    // Check if user has completed booking for this tour
    const bookingCheck = await query(
      `SELECT id FROM bookings 
       WHERE user_id = $1 
       AND tour_id = $2 
       AND status = 'completed'
       LIMIT 1`,
      [userId, tourId]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Вы можете оставить отзыв только после завершения тура'
      } as ApiResponse<null>, { status: 403 });
    }

    // Check if user already reviewed this tour
    const existingReview = await query(
      'SELECT id FROM reviews WHERE user_id = $1 AND tour_id = $2',
      [userId, tourId]
    );

    if (existingReview.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Вы уже оставили отзыв на этот тур'
      } as ApiResponse<null>, { status: 400 });
    }

    // Create review
    const result = await query(
      `INSERT INTO reviews (user_id, tour_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, tourId, rating, comment || '']
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Отзыв успешно добавлен'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании отзыва'
    } as ApiResponse<null>, { status: 500 });
  }
}
