import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/groups
 * Get guide's groups
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

    const result = await query(
      `SELECT 
        gg.*,
        gs.tour_date,
        gs.start_time,
        t.name as tour_name
      FROM guide_groups gg
      JOIN guide_schedule gs ON gg.schedule_id = gs.id
      JOIN tours t ON gs.tour_id = t.id
      WHERE gs.guide_id = $1
      ORDER BY gs.tour_date DESC, gs.start_time DESC`,
      [userId]
    );

    const groups = result.rows.map(row => ({
      id: row.id,
      scheduleId: row.schedule_id,
      groupName: row.group_name,
      participants: row.participants,
      emergencyContacts: row.emergency_contacts,
      experienceLevels: row.experience_levels,
      specialNeeds: row.special_needs,
      equipmentChecklist: row.equipment_checklist,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tourDate: row.tour_date,
      startTime: row.start_time,
      tourName: row.tour_name
    }));

    return NextResponse.json({
      success: true,
      data: { groups }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get guide groups error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении групп'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/guide/groups
 * Create new group
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
      scheduleId,
      groupName,
      participants,
      emergencyContacts,
      experienceLevels,
      specialNeeds,
      equipmentChecklist
    } = body;

    // Verify schedule belongs to guide
    const scheduleCheck = await query(
      'SELECT id FROM guide_schedule WHERE id = $1 AND guide_id = $2',
      [scheduleId, userId]
    );

    if (scheduleCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Расписание не найдено'
      } as ApiResponse<null>, { status: 404 });
    }

    // Create group
    const result = await query(
      `INSERT INTO guide_groups (
        schedule_id, group_name, participants, emergency_contacts,
        experience_levels, special_needs, equipment_checklist, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'forming')
      RETURNING *`,
      [
        scheduleId,
        groupName,
        JSON.stringify(participants || []),
        JSON.stringify(emergencyContacts || []),
        JSON.stringify(experienceLevels || {}),
        specialNeeds,
        JSON.stringify(equipmentChecklist || [])
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Группа создана'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании группы'
    } as ApiResponse<null>, { status: 500 });
  }
}
