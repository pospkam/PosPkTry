import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getGuidePartnerId } from '@/lib/auth/guide-helpers';
import { requireRole } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/reviews
 * Get guide's reviews with statistics
 */
export async function GET(request: NextRequest) {
  try {
    const guideOrResponse = await requireRole(request, ['guide', 'admin']);
    if (guideOrResponse instanceof NextResponse) return guideOrResponse;
    const userId = guideOrResponse.userId;

    const guideId = await getGuidePartnerId(userId);
    
    if (!guideId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль гида не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const filter = searchParams.get('filter') || 'all'; // all, replied, unreplied, positive, negative

    let queryStr = `
      SELECT 
        gr.*,
        u.name as tourist_name,
        u.email as tourist_email,
        b.id as booking_id,
        t.title as tour_title
      FROM guide_reviews gr
      LEFT JOIN users u ON gr.tourist_id = u.id
      LEFT JOIN bookings b ON gr.booking_id = b.id
      LEFT JOIN tours t ON b.tour_id = t.id
      WHERE gr.guide_id = $1 AND gr.is_public = true
    `;

    const params: any[] = [guideId];
    const paramIndex = 2;

    // Apply filters
    if (filter === 'replied') {
      queryStr += ` AND gr.guide_reply IS NOT NULL`;
    } else if (filter === 'unreplied') {
      queryStr += ` AND gr.guide_reply IS NULL`;
    } else if (filter === 'positive') {
      queryStr += ` AND gr.rating >= 4`;
    } else if (filter === 'negative') {
      queryStr += ` AND gr.rating <= 2`;
    }

    queryStr += `
      ORDER BY gr.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    // Get statistics
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(*) FILTER (WHERE rating = 5) as five_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 1) as one_star,
        COUNT(*) FILTER (WHERE guide_reply IS NOT NULL) as replied_count,
        COUNT(*) FILTER (WHERE guide_reply IS NULL) as unreplied_count,
        COALESCE(AVG(professionalism_rating), 0) as avg_professionalism,
        COALESCE(AVG(knowledge_rating), 0) as avg_knowledge,
        COALESCE(AVG(communication_rating), 0) as avg_communication
      FROM guide_reviews
      WHERE guide_id = $1 AND is_public = true`,
      [guideId]
    );

    const stats = statsResult.rows[0];

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM guide_reviews WHERE guide_id = $1 AND is_public = true`;
    const countParams = [guideId];
    
    if (filter === 'replied') {
      countQuery += ` AND guide_reply IS NOT NULL`;
    } else if (filter === 'unreplied') {
      countQuery += ` AND guide_reply IS NULL`;
    } else if (filter === 'positive') {
      countQuery += ` AND rating >= 4`;
    } else if (filter === 'negative') {
      countQuery += ` AND rating <= 2`;
    }
    
    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    const reviews = result.rows.map(row => ({
      id: row.id,
      guideId: row.guide_id,
      touristId: row.tourist_id,
      touristName: row.tourist_name,
      touristEmail: row.tourist_email,
      bookingId: row.booking_id,
      tourTitle: row.tour_title,
      rating: row.rating,
      professionalismRating: row.professionalism_rating,
      knowledgeRating: row.knowledge_rating,
      communicationRating: row.communication_rating,
      comment: row.comment,
      guideReply: row.guide_reply,
      guideReplyAt: row.guide_reply_at,
      isVerified: row.is_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        stats: {
          totalReviews: parseInt(stats.total_reviews),
          avgRating: parseFloat(stats.avg_rating).toFixed(2),
          distribution: {
            fiveStar: parseInt(stats.five_star),
            fourStar: parseInt(stats.four_star),
            threeStar: parseInt(stats.three_star),
            twoStar: parseInt(stats.two_star),
            oneStar: parseInt(stats.one_star)
          },
          repliedCount: parseInt(stats.replied_count),
          unrepliedCount: parseInt(stats.unreplied_count),
          avgProfessionalism: parseFloat(stats.avg_professionalism).toFixed(2),
          avgKnowledge: parseFloat(stats.avg_knowledge).toFixed(2),
          avgCommunication: parseFloat(stats.avg_communication).toFixed(2)
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
    console.error('Get reviews error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении отзывов'
    } as ApiResponse<null>, { status: 500 });
  }
}
