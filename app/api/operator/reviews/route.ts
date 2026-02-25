import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/reviews
 * Get all reviews for operator's tours
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
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

    const operatorId = await getOperatorPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const rating = searchParams.get('rating');
    const tourId = searchParams.get('tourId');
    const offset = (page - 1) * limit;

    // Build query
    let queryStr = `
      SELECT 
        r.id,
        r.tour_id,
        t.name as tour_name,
        r.user_id,
        u.name as user_name,
        u.email as user_email,
        r.rating,
        r.comment,
        r.is_verified,
        r.created_at,
        r.updated_at,
        COALESCE(array_agg(DISTINCT a.url) FILTER (WHERE a.url IS NOT NULL), '{}') as photos
      FROM reviews r
      JOIN tours t ON r.tour_id = t.id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN review_assets ra ON r.id = ra.review_id
      LEFT JOIN assets a ON ra.asset_id = a.id
      WHERE t.operator_id = $1
    `;

    const params: any[] = [operatorId];
    let paramIndex = 2;

    // Rating filter
    if (rating) {
      queryStr += ` AND r.rating = $${paramIndex}`;
      params.push(parseInt(rating));
      paramIndex++;
    }

    // Tour filter
    if (tourId) {
      queryStr += ` AND r.tour_id = $${paramIndex}`;
      params.push(tourId);
      paramIndex++;
    }

    queryStr += `
      GROUP BY r.id, t.id, u.id
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM reviews r
      JOIN tours t ON r.tour_id = t.id
      WHERE t.operator_id = $1
    `;
    const countParams: any[] = [operatorId];
    let countIndex = 2;

    if (rating) {
      countQuery += ` AND r.rating = $${countIndex}`;
      countParams.push(parseInt(rating));
      countIndex++;
    }

    if (tourId) {
      countQuery += ` AND r.tour_id = $${countIndex}`;
      countParams.push(tourId);
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    const reviews = result.rows.map(row => ({
      id: row.id,
      tourId: row.tour_id,
      tourName: row.tour_name,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      rating: row.rating,
      comment: row.comment,
      isVerified: row.is_verified,
      photos: row.photos,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // Get rating distribution
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(r.rating) as avg_rating,
        COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_stars,
        COUNT(CASE WHEN r.rating = 4 THEN 1 END) as four_stars,
        COUNT(CASE WHEN r.rating = 3 THEN 1 END) as three_stars,
        COUNT(CASE WHEN r.rating = 2 THEN 1 END) as two_stars,
        COUNT(CASE WHEN r.rating = 1 THEN 1 END) as one_star
      FROM reviews r
      JOIN tours t ON r.tour_id = t.id
      WHERE t.operator_id = $1`,
      [operatorId]
    );

    const stats = statsResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        stats: {
          totalReviews: parseInt(stats.total_reviews),
          avgRating: parseFloat(stats.avg_rating || 0).toFixed(2),
          distribution: {
            5: parseInt(stats.five_stars),
            4: parseInt(stats.four_stars),
            3: parseInt(stats.three_stars),
            2: parseInt(stats.two_stars),
            1: parseInt(stats.one_star)
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
    console.error('Get operator reviews error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении отзывов'
    } as ApiResponse<null>, { status: 500 });
  }
}
