import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/schedule
 * Get guide's schedule
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let queryStr = `
      SELECT 
        gs.id,
        gs.tour_date,
        gs.start_time,
        gs.end_time,
        gs.meeting_point,
        gs.participants_count,
        gs.max_participants,
        gs.status,
        gs.weather_conditions,
        gs.safety_notes,
        gs.special_requirements,
        gs.created_at,
        gs.updated_at,
        t.id as tour_id,
        t.name as tour_name,
        t.difficulty as tour_difficulty,
        t.duration as tour_duration
      FROM guide_schedule gs
      JOIN tours t ON gs.tour_id = t.id
      WHERE gs.guide_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (startDate) {
      queryStr += ` AND gs.tour_date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      queryStr += ` AND gs.tour_date <= $${paramIndex++}`;
      params.push(endDate);
    }

    queryStr += ' ORDER BY gs.tour_date ASC, gs.start_time ASC';

    const result = await query(queryStr, params);

    const schedule = result.rows.map(row => ({
      id: row.id,
      tourDate: row.tour_date,
      startTime: row.start_time,
      endTime: row.end_time,
      meetingPoint: row.meeting_point,
      participantsCount: row.participants_count,
      maxParticipants: row.max_participants,
      status: row.status,
      weatherConditions: row.weather_conditions,
      safetyNotes: row.safety_notes,
      specialRequirements: row.special_requirements,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tour: {
        id: row.tour_id,
        name: row.tour_name,
        difficulty: row.tour_difficulty,
        duration: row.tour_duration
      }
    }));

    return NextResponse.json({
      success: true,
      data: { schedule }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get guide schedule error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/guide/schedule
 * Create schedule entry
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const body = await request.json();
    const {
      tourId,
      tourDate,
      startTime,
      endTime,
      meetingPoint,
      maxParticipants,
      specialRequirements
    } = body;

    // Validation
    if (!tourId || !tourDate || !startTime) {
      return NextResponse.json({
        success: false,
        error: 'Заполните все обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

    // Check for conflicts
    const conflictCheck = await query(
      `SELECT id FROM guide_schedule 
       WHERE guide_id = $1 AND tour_date = $2 
       AND status NOT IN ('cancelled', 'completed')
       AND (
         (start_time <= $3 AND end_time >= $3) OR
         (start_time <= $4 AND end_time >= $4) OR
         (start_time >= $3 AND end_time <= $4)
       )`,
      [userId, tourDate, startTime, endTime || startTime]
    );

    if (conflictCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'В это время уже запланирован другой тур'
      } as ApiResponse<null>, { status: 409 });
    }

    // Create schedule entry
    const result = await query(
      `INSERT INTO guide_schedule (
        guide_id, tour_id, tour_date, start_time, end_time,
        meeting_point, max_participants, special_requirements, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
      RETURNING *`,
      [
        userId,
        tourId,
        tourDate,
        startTime,
        endTime,
        meetingPoint,
        maxParticipants,
        specialRequirements
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Расписание создано'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}
