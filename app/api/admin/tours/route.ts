import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tours
 * Get all tours (admin view)
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const result = await query(`
      SELECT 
        t.*,
        p.name as operator_name,
        array_agg(DISTINCT a.url) as images,
        COUNT(DISTINCT b.id) as bookings_count
      FROM tours t
      LEFT JOIN partners p ON t.operator_id = p.id
      LEFT JOIN tour_assets ta ON t.id = ta.tour_id
      LEFT JOIN assets a ON ta.asset_id = a.id
      LEFT JOIN bookings b ON t.id = b.tour_id
      GROUP BY t.id, p.id
      ORDER BY t.created_at DESC
    `);

    const tours = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      difficulty: row.difficulty,
      duration: row.duration,
      price: parseFloat(row.price),
      isActive: row.is_active,
      rating: parseFloat(row.rating),
      reviewCount: row.review_count,
      operatorName: row.operator_name,
      images: row.images.filter(Boolean),
      bookingsCount: parseInt(row.bookings_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: { tours }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get admin tours error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении туров'
    } as ApiResponse<null>, { status: 500 });
  }
}
