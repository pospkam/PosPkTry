import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/tours/[id] - Получение тура по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(`
      SELECT 
        id, name, description, short_description, category, difficulty,
        duration, price, currency, season, coordinates, requirements,
        included, not_included, max_group_size, min_group_size,
        rating, review_count, is_active, created_at, updated_at
      FROM tours
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tour not found',
      } as ApiResponse<null>, { status: 404 });
    }

    const row = result.rows[0];
    const tour = {
      id: row.id,
      name: row.name,
      description: row.description,
      shortDescription: row.short_description,
      category: row.category,
      difficulty: row.difficulty,
      duration: row.duration,
      price: parseFloat(row.price),
      currency: row.currency,
      season: row.season || [],
      coordinates: row.coordinates || [],
      requirements: row.requirements || [],
      included: row.included || [],
      notIncluded: row.not_included || [],
      maxGroupSize: row.max_group_size,
      minGroupSize: row.min_group_size,
      rating: parseFloat(row.rating) || 0,
      reviewCount: row.review_count || 0,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return NextResponse.json({
      success: true,
      data: tour,
    } as ApiResponse<typeof tour>);

  } catch (error) {
    console.error('Error fetching tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tour',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}
