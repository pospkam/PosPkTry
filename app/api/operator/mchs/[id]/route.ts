import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

interface MchsRegistrationDetailsRow {
  id: string;
  booking_id: string;
  group_composition: unknown;
  route: string;
  dates: unknown;
  guide_contacts: unknown;
  emergency_contacts: unknown;
  status: 'submitted' | 'registered' | 'rejected' | 'failed';
  created_at: string;
  updated_at: string;
  booking_status: string;
  booking_start_date: string | null;
  booking_end_date: string | null;
  tour_id: string;
  tour_name: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: parsedParams.error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const registrationId = parsedParams.data.id;

    const result = await query<MchsRegistrationDetailsRow>(
      `SELECT
         mr.id,
         mr.booking_id,
         mr.group_composition,
         mr.route,
         mr.dates,
         mr.guide_contacts,
         mr.emergency_contacts,
         mr.status,
         mr.created_at,
         mr.updated_at,
         b.status AS booking_status,
         b.start_date AS booking_start_date,
         b.end_date AS booking_end_date,
         t.id AS tour_id,
         t.name AS tour_name
       FROM mchs_registrations mr
       JOIN bookings b ON b.id = mr.booking_id
       JOIN tours t ON t.id = b.tour_id
       JOIN partners p ON p.id = t.operator_id
       WHERE mr.id = $1 AND p.user_id = $2
       LIMIT 1`,
      [registrationId, userOrResponse.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Регистрация в МЧС не найдена' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const registration = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: registration.id,
        bookingId: registration.booking_id,
        bookingStatus: registration.booking_status,
        bookingDates: {
          startDate: registration.booking_start_date,
          endDate: registration.booking_end_date,
        },
        tour: {
          id: registration.tour_id,
          name: registration.tour_name,
        },
        groupComposition: registration.group_composition,
        route: registration.route,
        dates: registration.dates,
        guideContacts: registration.guide_contacts,
        emergencyContacts: registration.emergency_contacts,
        status: registration.status,
        createdAt: registration.created_at,
        updatedAt: registration.updated_at,
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('[OPERATOR_MCHS_BY_ID_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MCHS registration' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
