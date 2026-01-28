import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

interface PriceInfo {
  date: string;
  price: number;
  type: 'regular' | 'peak' | 'discount';
}

/**
 * GET /api/accommodations/[id]/prices
 * Получить информацию о ценах на номера по датам
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start and end dates are required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем существование размещения
    const accommQuery = `
      SELECT id, name, price_per_night, is_active
      FROM accommodations
      WHERE id = $1
    `;
    const accommResult = await query(accommQuery, [id]);

    if (accommResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Accommodation not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const accommodation = accommResult.rows[0];

    if (!accommodation.is_active) {
      return NextResponse.json({
        success: false,
        error: 'Accommodation is not active'
      } as ApiResponse<null>, { status: 400 });
    }

    // Генерируем цены для каждой даты
    // В реальном приложении это может быть в отдельной таблице
    const pricesQuery = `
      WITH RECURSIVE date_series AS (
        SELECT $1::date AS date
        UNION ALL
        SELECT date + 1
        FROM date_series
        WHERE date < $2::date
      )
      SELECT
        ds.date::text,
        CASE
          WHEN EXTRACT(DOW FROM ds.date) IN (5, 6) THEN $4::numeric * 1.2 -- выходные +20%
          ELSE $4::numeric
        END as price,
        CASE
          WHEN EXTRACT(DOW FROM ds.date) IN (5, 6) THEN 'peak'
          ELSE 'regular'
        END as price_type
      FROM date_series ds
      ORDER BY ds.date
    `;

    const pricesResult = await query(pricesQuery, [
      startDate,
      endDate,
      id,
      accommodation.price_per_night
    ]);

    const prices: PriceInfo[] = pricesResult.rows.map(row => ({
      date: row.date,
      price: Math.round(parseFloat(row.price)),
      type: row.price_type
    }));

    return NextResponse.json({
      success: true,
      data: {
        accommodationId: id,
        accommodationName: accommodation.name,
        startDate,
        endDate,
        basePrice: parseFloat(accommodation.price_per_night),
        prices
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch prices',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}


