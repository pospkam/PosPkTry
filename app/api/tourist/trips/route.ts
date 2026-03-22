import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile, validateTripData, updateTouristStats, checkTripAchievements } from '@/lib/auth/tourist-helpers';

const CreateTripSchema = z.object({
  tripName: z.string().min(1, 'Название поездки обязательно'),
  destination: z.string().min(1, 'Укажите направление'),
  startDate: z.string().min(1, 'Укажите дату начала'),
  endDate: z.string().min(1, 'Укажите дату окончания'),
  tripType: z.string().optional(),
  budget: z.number().optional(),
  participants: z.number().int().min(1, 'Минимум 1 участник').optional(),
  itinerary: z.array(z.unknown()).optional(),
  notes: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/tourist/trips - Get tourist trips
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryText = `
      SELECT tt.*,
        (SELECT json_agg(json_build_object(
          'id', tb.booking_id,
          'type', tb.booking_type,
          'start_time', tb.start_time,
          'end_time', tb.end_time
        ) ORDER BY tb.order_index)
        FROM trip_bookings tb
        WHERE tb.trip_id = tt.id) as bookings
      FROM tourist_trips tt
      WHERE tt.tourist_id = $1
    `;

    const params: unknown[] = [profile.id];
    let paramIndex = 2;

    if (status) {
      queryText += ` AND tt.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ` ORDER BY tt.start_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: {
        trips: result.rows,
        pagination: {
          total: result.rows.length,
          limit,
          offset
        }
      }
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении поездок' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/tourist/trips - Create new trip
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = CreateTripSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    const {
      tripName,
      destination,
      startDate,
      endDate,
      tripType,
      budget,
      participants,
      itinerary,
      notes,
      isPublic
    } = parsed.data;

    const validation = validateTripData({
      tripName,
      destination,
      startDate,
      endDate,
      participants: participants || 1
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO tourist_trips (
        tourist_id, trip_name, destination, start_date, end_date,
        trip_type, budget, participants, itinerary, notes, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        profile.id, tripName, destination, startDate, endDate,
        tripType || null, budget || null, participants || 1,
        JSON.stringify(itinerary || []), notes || null, isPublic || false
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании поездки' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
