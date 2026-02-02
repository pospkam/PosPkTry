import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transfers/search
 * Public endpoint to search available transfers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      from,
      to,
      date,
      passengers = 1,
      vehicleType
    } = body;

    if (!from || !to || !date || !passengers) {
      return NextResponse.json({
        success: false,
        error: 'Заполните обязательные поля: откуда, куда, дата, пассажиры'
      } as ApiResponse<null>, { status: 400 });
    }

    // Search for matching routes
    let queryStr = `
      SELECT 
        r.*,
        p.name as operator_name,
        p.rating as operator_rating,
        p.is_verified as operator_verified,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active' AND v.capacity >= $3) as available_vehicles
      FROM transfer_routes r
      JOIN partners p ON r.operator_id = p.id
      LEFT JOIN vehicles v ON p.id = v.operator_id
      WHERE r.is_active = true
      AND LOWER(r.from_location) LIKE LOWER($1)
      AND LOWER(r.to_location) LIKE LOWER($2)
    `;

    const params: any[] = [`%${from}%`, `%${to}%`, passengers];
    let paramIndex = 4;

    if (vehicleType) {
      queryStr += ` AND v.type = $${paramIndex}`;
      params.push(vehicleType);
      paramIndex++;
    }

    queryStr += `
      GROUP BY r.id, p.name, p.rating, p.is_verified
      HAVING COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active' AND v.capacity >= $3) > 0
      ORDER BY r.popular DESC, r.average_rating DESC, r.base_price ASC
    `;

    const result = await query(queryStr, params);

    // Calculate prices for each route
    const routes = result.rows.map(row => {
      let price = parseFloat(row.base_price);
      
      // Add distance pricing
      if (row.price_per_km && row.distance) {
        price += parseFloat(row.price_per_km) * parseFloat(row.distance);
      }
      
      // Passenger multiplier
      if (passengers > 4) {
        price *= (1 + (passengers - 4) * 0.1);
      }
      
      // Weekend surcharge
      const dayOfWeek = new Date(date).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        price *= 1.1;
      }

      return {
        id: row.id,
        name: row.name,
        operatorId: row.operator_id,
        operatorName: row.operator_name,
        operatorRating: parseFloat(row.operator_rating),
        operatorVerified: row.operator_verified,
        fromLocation: row.from_location,
        toLocation: row.to_location,
        distance: parseFloat(row.distance),
        estimatedDuration: row.estimated_duration,
        price: Math.round(price),
        basePrice: parseFloat(row.base_price),
        popular: row.popular,
        averageRating: parseFloat(row.average_rating),
        transfersCount: row.transfers_count,
        availableVehicles: parseInt(row.available_vehicles),
        weatherDependent: row.weather_dependent,
        stops: row.stops,
        description: row.description
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        routes,
        searchParams: { from, to, date, passengers, vehicleType }
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Search transfers error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при поиске трансферов'
    } as ApiResponse<null>, { status: 500 });
  }
}
