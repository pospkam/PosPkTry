import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getGuidePartnerId, verifyScheduleOwnership } from '@/lib/auth/guide-helpers';
import { requireRole } from '@/lib/auth/middleware';
import { z } from 'zod';

const CreateGroupSchema = z.object({
  scheduleId: z.string().min(1, 'scheduleId обязателен'),
  groupName: z.string().min(1, 'Название группы обязательно'),
  participants: z.array(z.unknown()).optional(),
  emergencyContacts: z.array(z.unknown()).optional(),
  experienceLevels: z.record(z.unknown()).optional(),
  specialNeeds: z.string().optional(),
  equipmentChecklist: z.array(z.unknown()).optional(),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/groups
 * Get guide's groups
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
      [guideId]
    );

    const groups = result.rows.map(row => ({
      id: row.id,
      scheduleId: row.schedule_id,
      groupName: row.group_name,
      participants: row.participants ?? [],
      emergencyContacts: row.emergency_contacts ?? [],
      experienceLevels: row.experience_levels ?? {},
      specialNeeds: row.special_needs,
      equipmentChecklist: row.equipment_checklist ?? [],
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
    } as ApiResponse<unknown>);

  } catch (error) {
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
    const parsed = CreateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' }, { status: 400 });
    }
    const {
      scheduleId,
      groupName,
      participants,
      emergencyContacts,
      experienceLevels,
      specialNeeds,
      equipmentChecklist
    } = parsed.data;

    // Verify schedule belongs to current guide
    const ownsSchedule = await verifyScheduleOwnership(userId, scheduleId);

    if (!ownsSchedule) {
      return NextResponse.json({
        success: false,
        error: 'Расписание не найдено'
      } as ApiResponse<null>, { status: 404 });
    }

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

    const row = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        scheduleId: row.schedule_id,
        groupName: row.group_name,
        participants: row.participants ?? [],
        emergencyContacts: row.emergency_contacts ?? [],
        experienceLevels: row.experience_levels ?? {},
        specialNeeds: row.special_needs,
        equipmentChecklist: row.equipment_checklist ?? [],
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      },
      message: 'Группа создана'
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании группы'
    } as ApiResponse<null>, { status: 500 });
  }
}
