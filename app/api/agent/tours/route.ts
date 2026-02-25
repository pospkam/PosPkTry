import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/tours
 * Get all available tours for agents to sell
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'agent') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Get all active tours with commission info
    const result = await query(
      `SELECT 
        t.id,
        t.name,
        t.description,
        t.difficulty,
        t.duration,
        t.price,
        t.max_group_size,
        t.min_group_size,
        t.rating,
        t.review_count,
        t.is_active,
        p.name as operator_name,
        p.rating as operator_rating,
        array_agg(DISTINCT a.url) as images
      FROM tours t
      JOIN partners p ON t.operator_id = p.id
      LEFT JOIN tour_assets ta ON t.id = ta.tour_id
      LEFT JOIN assets a ON ta.asset_id = a.id
      WHERE t.is_active = true
      GROUP BY t.id, p.id
      ORDER BY t.rating DESC, t.review_count DESC`,
      []
    );

    const tours = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      difficulty: row.difficulty,
      duration: row.duration,
      price: parseFloat(row.price),
      maxGroupSize: row.max_group_size,
      minGroupSize: row.min_group_size,
      rating: parseFloat(row.rating),
      reviewCount: row.review_count,
      isActive: row.is_active,
      operatorName: row.operator_name,
      operatorRating: parseFloat(row.operator_rating),
      images: row.images.filter(Boolean),
      commission: parseFloat(row.price) * 0.15 // 15% commission for agents
    }));

    return NextResponse.json({
      success: true,
      data: { tours }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get agent tours error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении туров'
    } as ApiResponse<null>, { status: 500 });
  }
}
