import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getGuidePartnerId } from '@/lib/auth/guide-helpers';
import { requireRole } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/tours
 * Туры гида: сначала туры оператора к которому прикреплён (guide_operator_id),
 * иначе — все опубликованные boat_trip туры как fallback.
 */
export async function GET(request: NextRequest) {
  const userOrResponse = await requireRole(request, ['guide', 'admin']);
  if (userOrResponse instanceof NextResponse) return userOrResponse;
  const userId = userOrResponse.userId;

  const guideId = await getGuidePartnerId(userId);
  if (!guideId) {
    return NextResponse.json(
      { success: false, error: 'Профиль гида не найден' } as ApiResponse<null>,
      { status: 404 }
    );
  }

  const guideRow = await query<{ guide_operator_id: string | null }>(
    'SELECT guide_operator_id FROM partners WHERE id = $1',
    [guideId]
  );
  const operatorId = guideRow.rows[0]?.guide_operator_id ?? null;

  const result = await query<{
    id: string; title: string; slug: string; description: string | null;
    activity_type: string; duration_hours: string; base_price: string;
    max_participants: string; is_published: boolean;
    includes_guide: boolean; includes_equipment: boolean;
    operator_id: string; operator_name: string; operator_phone: string | null;
    upcoming_slots: string; future_slots: string;
  }>(
    `SELECT
       ot.id,
       ot.title,
       ot.slug,
       ot.description,
       ot.activity_type,
       ot.duration_hours,
       ot.base_price,
       ot.max_participants,
       ot.is_published,
       ot.includes_guide,
       ot.includes_equipment,
       p.id            AS operator_id,
       p.company_name  AS operator_name,
       p.contacts->>'phone' AS operator_phone,
       COUNT(ta.id)    AS upcoming_slots,
       COUNT(CASE WHEN ta.available_date >= CURRENT_DATE THEN 1 END) AS future_slots
     FROM operator_tours ot
     JOIN partners p ON ot.operator_id = p.id
     LEFT JOIN tour_availability ta
       ON ta.tour_id = ot.id AND ta.available_date >= CURRENT_DATE
     WHERE ot.deleted_at IS NULL
       AND ot.is_published = TRUE
       AND ($1::bigint IS NULL OR ot.operator_id = $1::bigint)
     GROUP BY ot.id, p.id
     ORDER BY future_slots DESC, ot.base_price ASC`,
    [operatorId]
  );

  return NextResponse.json({
    success: true,
    data: {
      tours: result.rows.map(r => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        description: r.description,
        activityType: r.activity_type,
        durationHours: parseFloat(r.duration_hours),
        basePrice: parseFloat(r.base_price),
        maxParticipants: parseInt(r.max_participants),
        isPublished: r.is_published,
        includesGuide: r.includes_guide,
        includesEquipment: r.includes_equipment,
        operatorId: r.operator_id,
        operatorName: r.operator_name,
        operatorPhone: r.operator_phone,
        upcomingSlots: parseInt(r.upcoming_slots),
        futureSlots: parseInt(r.future_slots),
      })),
      operatorLinked: operatorId !== null,
    },
  } as ApiResponse<unknown>);
}
