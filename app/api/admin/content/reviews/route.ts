import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { ApiResponse, PaginatedResponse } from '@/types';

export const dynamic = 'force-dynamic';

interface AdminReview {
  id: string;
  userId: string;
  userName: string;
  tourId: string;
  tourName: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  createdAt: Date;
}

/**
 * GET /api/admin/content/reviews
 * Получение отзывов для модерации
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const verified = searchParams.get('verified');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (verified !== null && verified !== undefined) {
      whereConditions.push(`r.is_verified = $${paramIndex}`);
      queryParams.push(verified === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Подсчёт
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reviews r
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Получение отзывов
    const reviewsQuery = `
      SELECT
        r.id,
        r.user_id,
        r.tour_id,
        r.rating,
        r.comment,
        r.is_verified,
        r.created_at,
        u.name as user_name,
        t.name as tour_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN tours t ON r.tour_id = t.id
      ${whereClause}
      ORDER BY r.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const reviewsResult = await query(reviewsQuery, queryParams);

    const reviews: AdminReview[] = reviewsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || 'Неизвестно',
      tourId: row.tour_id,
      tourName: row.tour_name || 'Неизвестно',
      rating: parseInt(row.rating),
      comment: row.comment || '',
      isVerified: row.is_verified,
      createdAt: new Date(row.created_at)
    }));

    const response: PaginatedResponse<AdminReview> = {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    } as ApiResponse<PaginatedResponse<AdminReview>>);

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch reviews',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



