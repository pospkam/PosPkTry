import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { findAvailableGear } from '@/lib/auth/gear-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gear - Public endpoint to get available gear items
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const available = searchParams.get('available') === 'true';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const items = await findAvailableGear(
      category,
      startDate,
      endDate,
      minPrice,
      maxPrice
    );

    // Client-side pagination
    const total = items.length;
    const paginatedItems = items.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedItems,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching gear:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении снаряжения' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}