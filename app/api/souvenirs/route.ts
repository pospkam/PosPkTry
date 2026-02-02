import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { findAvailableSouvenirs } from '@/lib/auth/souvenir-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/souvenirs - Public endpoint to search available souvenirs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      category: searchParams.get('category') || undefined,
      subcategory: searchParams.get('subcategory') || undefined,
      tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      isHandmade: searchParams.get('isHandmade') === 'true' ? true : undefined,
      isFeatured: searchParams.get('isFeatured') === 'true' ? true : undefined,
      inStock: searchParams.get('inStock') === 'true' ? true : undefined,
      searchQuery: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    const souvenirs = await findAvailableSouvenirs(filters);

    return NextResponse.json({
      success: true,
      data: souvenirs,
      pagination: {
        total: souvenirs.length,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: souvenirs.length === filters.limit
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching souvenirs:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении сувениров' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}






