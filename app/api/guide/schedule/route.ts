import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getGuidePartnerId, checkScheduleConflicts, hasTourDayConflict } from '@/lib/auth/guide-helpers';
import { requireRole } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/schedule
 * Get guide's schedule with conflict detection
 */
export async function GET(request: NextRequest) {
  try {
    const guideOrResponse = await requireRole(request, ['guide', 'admin']);
    if (guideOrResponse instanceof NextResponse) return guideOrResponse;
    const userId = guideOrResponse.userId;

    const guideId = await getGuidePartnerId(userId);
    
    if (!guideId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль гида не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status') || 'all';

    let queryStr = `
      SELECT 
        gs.*,
        t.title as tour_title,
        b.status as booking_status,
        ST_X(gs.location::geometry) as longitude,
        ST_Y(gs.location::geometry) as latitude
      FROM guide_schedule gs
      LEFT JOIN tours t ON gs.tour_id = t.id
      LEFT JOIN bookings b ON gs.booking_id = b.id
      WHERE gs.guide_id = $1
    `;

    const params: any[] = [guideId];
    let paramIndex = 2;

    if (dateFrom) {
      queryStr += ` AND gs.start_time >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      queryStr += ` AND gs.start_time <= $${paramIndex}`;
      params.push(dateTo + ' 23:59:59');
      paramIndex++;
    }

    if (status !== 'all') {
      queryStr += ` AND gs.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryStr += ` ORDER BY gs.start_time ASC`;

    const result = await query(queryStr, params);

    const schedule = result.rows.map(row => ({
      id: row.id,
      guideId: row.guide_id,
      startTime: row.start_time,
      endTime: row.end_time,
      title: row.title,
      description: row.description,
      tourId: row.tour_id,
      tourTitle: row.tour_title,
      bookingId: row.booking_id,
      bookingStatus: row.booking_status,
      maxParticipants: row.max_participants,
      currentParticipants: row.current_participants,
      location: row.latitude && row.longitude ? {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      } : null,
      locationName: row.location_name,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: { schedule }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/guide/schedule
 * Create new schedule entry with conflict detection
 */
export async function POST(request: NextRequest) {
  try {
    const guideOrResponse = await requireRole(request, ['guide', 'admin']);
    if (guideOrResponse instanceof NextResponse) return guideOrResponse;
    const userId = guideOrResponse.userId;

    const guideId = await getGuidePartnerId(userId);
    
    if (!guideId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль гида не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
      const {
        startTime,
        endTime,
        title,
        description,
        tourId,
        bookingId,
        maxParticipants,
        location,
        locationName,
        notes
      } = body;

      // Validation
      if (!startTime || !endTime || !title) {
        return NextResponse.json({
          success: false,
          error: 'Заполните обязательные поля: startTime, endTime, title'
        } as ApiResponse<null>, { status: 400 });
      }

      const parsedStart = new Date(startTime);
      const parsedEnd = new Date(endTime);

      if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
        return NextResponse.json({
          success: false,
          error: 'Некорректный формат даты/времени'
        } as ApiResponse<null>, { status: 400 });
      }

      // Check time logic
      if (parsedStart >= parsedEnd) {
        return NextResponse.json({
          success: false,
          error: 'Время окончания должно быть позже времени начала'
        } as ApiResponse<null>, { status: 400 });
      }

      if (maxParticipants && (typeof maxParticipants !== 'number' || maxParticipants <= 0)) {
        return NextResponse.json({
          success: false,
          error: 'maxParticipants должно быть положительным числом'
        } as ApiResponse<null>, { status: 400 });
      }

      // Check for conflicts
      const noConflicts = await checkScheduleConflicts(guideId, startTime, endTime);
      
      if (!noConflicts) {
        return NextResponse.json({
          success: false,
          error: 'Конфликт расписания! У вас уже запланировано мероприятие в это время.',
          message: 'Выберите другое время или отмените существующее мероприятие.'
        } as ApiResponse<null>, { status: 409 });
      }

      if (tourId) {
        const hasSameDaySlot = await hasTourDayConflict({
          guideId,
          tourId,
          startTime,
        });

        if (hasSameDaySlot) {
          return NextResponse.json({
            success: false,
            error: 'У вас уже есть слот для этого тура на выбранный день'
          } as ApiResponse<null>, { status: 409 });
        }
      }

    // Create schedule entry
    let insertQuery = `
      INSERT INTO guide_schedule (
        guide_id, start_time, end_time, title, description,
        tour_id, booking_id, max_participants, location, location_name, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, `;
    
    const insertParams: any[] = [
      guideId,
      startTime,
      endTime,
      title,
      description,
      tourId,
      bookingId,
      maxParticipants || 10
    ];

    if (location && location.lat && location.lng) {
      insertQuery += `ST_SetSRID(ST_MakePoint($9, $10), 4326)::geography, $11, $12, 'scheduled')`;
      insertParams.push(location.lng, location.lat, locationName, notes);
    } else {
      insertQuery += `NULL, $9, $10, 'scheduled')`;
      insertParams.push(locationName, notes);
    }

    insertQuery += ` RETURNING *`;

    const result = await query(insertQuery, insertParams);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Мероприятие успешно добавлено в расписание'
    } as ApiResponse<any>);

  } catch (error: any) {
    console.error('Create schedule error:', error);
    
    // Handle exclusion constraint violation (overlapping schedules)
    if (error.code === '23P01') {
      return NextResponse.json({
        success: false,
        error: 'Конфликт расписания! Время пересекается с существующим мероприятием.'
      } as ApiResponse<null>, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}
