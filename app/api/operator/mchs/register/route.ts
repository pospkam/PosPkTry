import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { registerGroupWithMchs } from '@/lib/safety/mchs-client';

export const dynamic = 'force-dynamic';

const registrationStatusSchema = z.enum(['submitted', 'registered', 'rejected', 'failed']);

const listRegistrationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const groupCompositionItemSchema = z.object({
  fullName: z.string().min(3).max(150),
  phone: z.string().min(5).max(30).optional(),
  role: z.string().max(100).optional(),
});

const emergencyContactSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().min(5).max(30),
  relation: z.string().max(100).optional(),
});

const guideContactsSchema = z.object({
  fullName: z.string().min(3).max(150),
  phone: z.string().min(5).max(30),
  email: z.string().email().optional(),
});

const mchsDatesSchema = z
  .object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    const startDate = new Date(value.startDate);
    const endDate = new Date(value.endDate);

    if (Number.isNaN(startDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'Неверный формат startDate',
      });
    }

    if (Number.isNaN(endDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'Неверный формат endDate',
      });
    }

    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && startDate > endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'Дата окончания не может быть раньше даты начала',
      });
    }
  });

const createRegistrationSchema = z.object({
  bookingId: z.string().uuid(),
  groupComposition: z.array(groupCompositionItemSchema).min(1).max(100),
  route: z.string().min(10).max(5000),
  dates: mchsDatesSchema,
  guideContacts: guideContactsSchema,
  emergencyContacts: z.array(emergencyContactSchema).min(1).max(20),
});

type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

interface MchsRegistrationListRow {
  id: string;
  booking_id: string;
  route: string;
  dates: unknown;
  status: RegistrationStatus;
  created_at: string;
  updated_at: string;
}

interface MchsSummaryRow {
  total: string;
  submitted: string;
  registered: string;
  rejected: string;
  failed: string;
}

interface BookingOwnershipRow {
  id: string;
  guests_count: number | null;
  tour_name: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = listRegistrationsQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: queryValidation.error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { limit } = queryValidation.data;

    const listResult = await query<MchsRegistrationListRow>(
      `SELECT
         mr.id,
         mr.booking_id,
         mr.route,
         mr.dates,
         mr.status,
         mr.created_at,
         mr.updated_at
       FROM mchs_registrations mr
       JOIN bookings b ON b.id = mr.booking_id
       JOIN tours t ON t.id = b.tour_id
       JOIN partners p ON p.id = t.operator_id
       WHERE p.user_id = $1
       ORDER BY mr.created_at DESC
       LIMIT $2`,
      [userOrResponse.userId, limit]
    );

    const summaryResult = await query<MchsSummaryRow>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE mr.status = 'submitted')::text AS submitted,
         COUNT(*) FILTER (WHERE mr.status = 'registered')::text AS registered,
         COUNT(*) FILTER (WHERE mr.status = 'rejected')::text AS rejected,
         COUNT(*) FILTER (WHERE mr.status = 'failed')::text AS failed
       FROM mchs_registrations mr
       JOIN bookings b ON b.id = mr.booking_id
       JOIN tours t ON t.id = b.tour_id
       JOIN partners p ON p.id = t.operator_id
       WHERE p.user_id = $1`,
      [userOrResponse.userId]
    );

    const summary = summaryResult.rows[0] ?? {
      total: '0',
      submitted: '0',
      registered: '0',
      rejected: '0',
      failed: '0',
    };

    return NextResponse.json({
      success: true,
      data: {
        registrations: listResult.rows.map(item => ({
          id: item.id,
          bookingId: item.booking_id,
          route: item.route,
          dates: item.dates,
          status: item.status,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })),
        summary: {
          total: Number.parseInt(summary.total, 10) || 0,
          submitted: Number.parseInt(summary.submitted, 10) || 0,
          registered: Number.parseInt(summary.registered, 10) || 0,
          rejected: Number.parseInt(summary.rejected, 10) || 0,
          failed: Number.parseInt(summary.failed, 10) || 0,
        },
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('[OPERATOR_MCHS_REGISTER_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MCHS registrations' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const payload: unknown = await request.json();
    const validation = createRegistrationSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const registrationData = validation.data;

    const bookingOwnership = await query<BookingOwnershipRow>(
      `SELECT b.id, b.guests_count, t.name AS tour_name
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       JOIN partners p ON p.id = t.operator_id
       WHERE b.id = $1 AND p.user_id = $2
       LIMIT 1`,
      [registrationData.bookingId, userOrResponse.userId]
    );

    if (bookingOwnership.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Бронирование не найдено или недоступно' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const booking = bookingOwnership.rows[0];

    // Сверяем состав группы с бронированием, чтобы в МЧС уходили актуальные данные.
    if (
      typeof booking.guests_count === 'number' &&
      booking.guests_count > 0 &&
      registrationData.groupComposition.length !== booking.guests_count
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Количество участников в составе группы должно совпадать с бронированием',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const generatedGroupName = booking.tour_name
      ? `Группа ${booking.tour_name}`
      : `Группа ${registrationData.bookingId.slice(0, 8)}`;

    const mchsResult = await registerGroupWithMchs({
      groupName: generatedGroupName,
      groupMembers: registrationData.groupComposition.map(member => ({
        fullName: member.fullName,
        phone: member.phone,
      })),
      routeDescription: registrationData.route,
      startDate: registrationData.dates.startDate,
      endDate: registrationData.dates.endDate,
      guideContact: registrationData.guideContacts,
      emergencyContacts: registrationData.emergencyContacts,
      participantCount: registrationData.groupComposition.length,
    });

    const inserted = await query<{
      id: string;
      status: RegistrationStatus;
      created_at: string;
    }>(
      `INSERT INTO mchs_registrations (
         booking_id,
         group_composition,
         route,
         dates,
         guide_contacts,
         emergency_contacts,
         status,
         created_at,
         updated_at
       ) VALUES (
         $1,
         $2::jsonb,
         $3,
         $4::jsonb,
         $5::jsonb,
         $6::jsonb,
         $7,
         NOW(),
         NOW()
       )
       RETURNING id, status, created_at`,
      [
        registrationData.bookingId,
        JSON.stringify(registrationData.groupComposition),
        registrationData.route,
        JSON.stringify(registrationData.dates),
        JSON.stringify(registrationData.guideContacts),
        JSON.stringify(registrationData.emergencyContacts),
        mchsResult.status,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: inserted.rows[0].id,
          bookingId: registrationData.bookingId,
          status: inserted.rows[0].status,
          createdAt: inserted.rows[0].created_at,
          mchsError: mchsResult.errorMessage,
        },
        message:
          mchsResult.status === 'failed'
            ? 'Заявка сохранена, но отправка в МЧС не удалась'
            : 'Заявка на регистрацию группы в МЧС отправлена',
      } as ApiResponse<unknown>,
      { status: 201 }
    );
  } catch (error) {
    console.error('[OPERATOR_MCHS_REGISTER_POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register group in MCHS' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
