import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { findAvailableCars } from '@/lib/auth/cars-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cars - Public endpoint to search available cars
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      category: searchParams.get('category') || undefined,
      transmission: searchParams.get('transmission') || undefined,
      fuelType: searchParams.get('fuelType') || undefined,
      seats: searchParams.get('seats') ? parseInt(searchParams.get('seats')!) : undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      features: searchParams.get('features') ? searchParams.get('features')!.split(',') : undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    const cars = await findAvailableCars(filters);

    return NextResponse.json({
      success: true,
      data: cars,
      pagination: {
        total: cars.length,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: cars.length === filters.limit
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching cars:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении автомобилей' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}