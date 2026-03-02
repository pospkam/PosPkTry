import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

type MchsStatus = 'pending' | 'submitted' | 'confirmed' | 'rejected';

interface MchsRegistrationDetailsRow {
  id: string;
  booking_id: string;
  operator_id: string;
  group_composition: unknown;
  route: string;
  start_date: string;
  end_date: string;
  guide_contacts: unknown;
  emergency_contacts: unknown;
  status: MchsStatus;
  mchs_reference: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/operator/mchs/[id]
 * Получение деталей одной регистрации МЧС
 * Фильтрация по operator_id предотвращает доступ к чужим записям (anti-enumeration)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    // operator_id из JWT-сессии через partners
    const operatorId = await getOperatorPartnerId(userOrResponse.userId);
    if (!operatorId) {
      return NextResponse.json(
        { success: false, error: 'Партнёрский профиль оператора не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: parsedParams.error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const registrationId = parsedParams.data.id;

    // Ownership filter: WHERE id = $1 AND operator_id = $2
    // Возвращает 404 для чужих записей (anti-enumeration)
    const result = await query<MchsRegistrationDetailsRow>(
      `SELECT
         id,
         booking_id,
         operator_id,
         group_composition,
         route,
         start_date,
         end_date,
         guide_contacts,
         emergency_contacts,
         status,
         mchs_reference,
         created_at,
         updated_at
       FROM mchs_registrations
       WHERE id = $1 AND operator_id = $2
       LIMIT 1`,
      [registrationId, operatorId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Регистрация в МЧС не найдена' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const reg = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: reg.id,
        bookingId: reg.booking_id,
        operatorId: reg.operator_id,
        groupComposition: reg.group_composition,
        route: reg.route,
        startDate: reg.start_date,
        endDate: reg.end_date,
        guideContacts: reg.guide_contacts,
        emergencyContacts: reg.emergency_contacts,
        status: reg.status,
        mchsReference: reg.mchs_reference,
        createdAt: reg.created_at,
        updatedAt: reg.updated_at,
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('[OPERATOR_MCHS_BY_ID_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Не удалось загрузить регистрацию МЧС' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
