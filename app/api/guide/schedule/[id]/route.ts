import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyScheduleOwnership, checkScheduleConflicts, hasTourDayConflict } from '@/lib/auth/guide-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/schedule/[id]
 * Get specific schedule entry
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const isOwner = await verifyScheduleOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Запись расписания не найдена или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const result = await query(
      `SELECT 
        gs.*,
        t.title as tour_title,
        b.status as booking_status,
        ST_X(gs.location::geometry) as longitude,
        ST_Y(gs.location::geometry) as latitude
      FROM guide_schedule gs
      LEFT JOIN tours t ON gs.tour_id = t.id
      LEFT JOIN bookings b ON gs.booking_id = b.id
      WHERE gs.id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Запись расписания не найдена'
      } as ApiResponse<null>, { status: 404 });
    }

    const row = result.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
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
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get schedule entry error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении записи расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/guide/schedule/[id]
 * Update schedule entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

      const isOwner = await verifyScheduleOwnership(userId, params.id);
      
      if (!isOwner) {
        return NextResponse.json({
          success: false,
          error: 'Запись расписания не найдена или у вас нет прав'
        } as ApiResponse<null>, { status: 404 });
      }

      const body = await request.json();

      const scheduleResult = await query(
        'SELECT guide_id, start_time, end_time, tour_id FROM guide_schedule WHERE id = $1',
        [params.id]
      );

      const scheduleRow = scheduleResult.rows[0];

      if (!scheduleRow) {
        return NextResponse.json({
          success: false,
          error: 'Запись расписания не найдена'
        } as ApiResponse<null>, { status: 404 });
      }

      const nextStartTime = body.startTime ?? scheduleRow.start_time;
      const nextEndTime = body.endTime ?? scheduleRow.end_time;

      if (!nextStartTime || !nextEndTime) {
        return NextResponse.json({
          success: false,
          error: 'startTime и endTime не могут быть пустыми'
        } as ApiResponse<null>, { status: 400 });
      }

      const parsedStart = new Date(nextStartTime);
      const parsedEnd = new Date(nextEndTime);

      if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
        return NextResponse.json({
          success: false,
          error: 'Некорректный формат даты/времени'
        } as ApiResponse<null>, { status: 400 });
      }

      if (parsedStart >= parsedEnd) {
        return NextResponse.json({
          success: false,
          error: 'Время окончания должно быть позже времени начала'
        } as ApiResponse<null>, { status: 400 });
      }

      const guideId = scheduleRow.guide_id;

      if (guideId) {
        const noConflicts = await checkScheduleConflicts(
          guideId,
          nextStartTime,
          nextEndTime,
          params.id
        );
        
        if (!noConflicts) {
          return NextResponse.json({
            success: false,
            error: 'Конфликт расписания! Новое время пересекается с другим мероприятием.'
          } as ApiResponse<null>, { status: 409 });
        }

        const nextTourId = body.tourId ?? scheduleRow.tour_id;
        if (await hasTourDayConflict({
          guideId,
          tourId: nextTourId,
          startTime: nextStartTime,
          excludeId: params.id,
        })) {
          return NextResponse.json({
            success: false,
            error: 'У вас уже есть слот для этого тура на выбранный день'
          } as ApiResponse<null>, { status: 409 });
        }
      }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

      const allowedFields = [
        'startTime', 'endTime', 'title', 'description', 'status',
        'maxParticipants', 'currentParticipants', 'locationName', 'notes', 'tourId'
      ];

      const dbFieldMap: Record<string, string> = {
        startTime: 'start_time',
        endTime: 'end_time',
        maxParticipants: 'max_participants',
        currentParticipants: 'current_participants',
        locationName: 'location_name',
        tourId: 'tour_id'
      };

    for (const [key, value] of Object.entries(body)) {
        if (allowedFields.includes(key)) {
          if (key === 'maxParticipants' && (typeof value !== 'number' || value <= 0)) {
            return NextResponse.json({
              success: false,
              error: 'maxParticipants должно быть положительным числом'
            } as ApiResponse<null>, { status: 400 });
          }

          if (key === 'currentParticipants' && (typeof value !== 'number' || value < 0)) {
            return NextResponse.json({
              success: false,
              error: 'currentParticipants не может быть отрицательным'
            } as ApiResponse<null>, { status: 400 });
          }

        const dbKey = dbFieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        updateValues.push(value);
      }
    }

    if (body.location && body.location.lat && body.location.lng) {
      updateFields.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography`);
      updateValues.push(body.location.lng, body.location.lat);
      paramIndex += 2;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(params.id);

    const result = await query(
      `UPDATE guide_schedule 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Расписание успешно обновлено'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update schedule error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/guide/schedule/[id]
 * Delete schedule entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const isOwner = await verifyScheduleOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Запись расписания не найдена или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    // Instead of hard delete, mark as cancelled if has bookings
    const checkResult = await query(
      'SELECT booking_id FROM guide_schedule WHERE id = $1',
      [params.id]
    );

    if (checkResult.rows[0]?.booking_id) {
      // Has associated booking, mark as cancelled
      await query(
        `UPDATE guide_schedule 
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1`,
        [params.id]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Мероприятие отменено (связанное бронирование сохранено)'
      } as ApiResponse<null>);
    } else {
      // No booking, safe to delete
      await query('DELETE FROM guide_schedule WHERE id = $1', [params.id]);
      
      return NextResponse.json({
        success: true,
        message: 'Запись расписания удалена'
      } as ApiResponse<null>);
    }

  } catch (error) {
    console.error('Delete schedule error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении записи расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}
