import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/groups - Получение групп гида
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const guideId = userOrResponse.userId;
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');

    let groupsQuery = `
      SELECT
        gg.id,
        gg.schedule_id,
        gg.group_name,
        gg.participants,
        gg.emergency_contacts,
        gg.experience_levels,
        gg.special_needs,
        gg.equipment_checklist,
        gg.status,
        gg.created_at,
        gs.tour_date,
        gs.start_time,
        t.name as tour_name
      FROM guide_groups gg
      JOIN guide_schedule gs ON gg.schedule_id = gs.id
      LEFT JOIN tours t ON gs.tour_id = t.id
      WHERE gs.guide_id = $1
    `;

    const params = [guideId];

    if (scheduleId) {
      groupsQuery += ` AND gg.schedule_id = $2`;
      params.push(scheduleId);
    }

    groupsQuery += ` ORDER BY gs.tour_date DESC, gs.start_time ASC`;

    const result = await query(groupsQuery, params);

    return NextResponse.json({
      success: true,
      data: { groups: result.rows }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки групп' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/guide/groups - Создание группы
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const body = await request.json();
    const {
      scheduleId,
      groupName,
      participants,
      emergencyContacts,
      experienceLevels,
      specialNeeds,
      equipmentChecklist
    } = body;

    const insertQuery = `
      INSERT INTO guide_groups (
        id, schedule_id, group_name, participants, emergency_contacts,
        experience_levels, special_needs, equipment_checklist, status, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'forming', NOW()
      ) RETURNING id
    `;

    const result = await query(insertQuery, [
      scheduleId,
      groupName,
      JSON.stringify(participants || []),
      JSON.stringify(emergencyContacts || []),
      JSON.stringify(experienceLevels || {}),
      specialNeeds,
      JSON.stringify(equipmentChecklist || [])
    ]);

    return NextResponse.json({
      success: true,
      data: { groupId: result.rows[0].id }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка создания группы' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}





























