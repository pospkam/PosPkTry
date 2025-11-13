import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/schedule - Получение расписания гида
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const guideId = userOrResponse.userId;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const scheduleQuery = `
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
        t.name as tour_name,
        t.duration as tour_duration,
        t.difficulty as tour_difficulty
      FROM guide_schedule gs
      LEFT JOIN tours t ON gs.tour_id = t.id
      WHERE gs.guide_id = $1
        AND to_char(gs.tour_date, 'YYYY-MM') = $2
      ORDER BY gs.tour_date ASC, gs.start_time ASC
    `;

    const result = await query(scheduleQuery, [guideId, month]);

    return NextResponse.json({
      success: true,
      data: {
        schedule: result.rows,
        month
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching guide schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки расписания' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/guide/schedule - Создание записи в расписании
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const guideId = userOrResponse.userId;
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

    const insertQuery = `
      INSERT INTO guide_schedule (
        id, guide_id, tour_id, tour_date, start_time, end_time,
        meeting_point, max_participants, special_requirements,
        participants_count, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 0, 'scheduled', NOW(), NOW()
      ) RETURNING id
    `;

    const result = await query(insertQuery, [
      guideId, tourId, tourDate, startTime, endTime,
      meetingPoint, maxParticipants, specialRequirements
    ]);

    return NextResponse.json({
      success: true,
      data: { scheduleId: result.rows[0].id }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка создания записи' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}





























