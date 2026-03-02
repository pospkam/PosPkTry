import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';
import { registerGroupWithMchs } from '@/lib/safety/mchs-client';

export const dynamic = 'force-dynamic';

const groupMemberSchema = z.object({
  fullName: z.string().min(3).max(150),
  phone: z.string().max(30).optional(),
  birthDate: z.string().optional(),
});

const emergencyContactSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().min(5).max(30),
  relation: z.string().max(80).optional(),
});

const guideContactSchema = z.object({
  fullName: z.string().min(3).max(150),
  phone: z.string().min(5).max(30),
  email: z.string().email().optional(),
});

const createMchsRegistrationSchema = z.object({
  groupName: z.string().min(3).max(255),
  groupMembers: z.array(groupMemberSchema).min(1),
  routeDescription: z.string().min(10).max(5000),
  routeRegion: z.string().max(255).optional(),
  startDate: z.string(),
  endDate: z.string(),
  guideContact: guideContactSchema,
  emergencyContacts: z.array(emergencyContactSchema).min(1),
  participantCount: z.number().int().min(1).max(100),
});

interface MchsRegistrationRow {
  id: string;
  group_name: string;
  route_description: string;
  route_region: string | null;
  start_date: string;
  end_date: string;
  participant_count: number;
  status: 'submitted' | 'registered' | 'rejected' | 'failed';
  mchs_request_id: string | null;
  last_error: string | null;
  submitted_at: string | null;
  created_at: string;
}

function parseDateIso(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

    const listResult = await query<MchsRegistrationRow>(
      `SELECT
         id,
         group_name,
         route_description,
         route_region,
         start_date,
         end_date,
         participant_count,
         status,
         mchs_request_id,
         last_error,
         submitted_at,
         created_at
       FROM mchs_group_registrations
       WHERE operator_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userOrResponse.userId, limit]
    );

    const summaryResult = await query<{
      total: string;
      submitted: string;
      registered: string;
      rejected: string;
      failed: string;
    }>(
      `SELECT
         COUNT(*)::text as total,
         COUNT(*) FILTER (WHERE status = 'submitted')::text as submitted,
         COUNT(*) FILTER (WHERE status = 'registered')::text as registered,
         COUNT(*) FILTER (WHERE status = 'rejected')::text as rejected,
         COUNT(*) FILTER (WHERE status = 'failed')::text as failed
       FROM mchs_group_registrations
       WHERE operator_user_id = $1`,
      [userOrResponse.userId]
    );

    const summaryRow = summaryResult.rows[0] || {
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
          groupName: item.group_name,
          routeDescription: item.route_description,
          routeRegion: item.route_region,
          startDate: item.start_date,
          endDate: item.end_date,
          participantCount: item.participant_count,
          status: item.status,
          mchsRequestId: item.mchs_request_id,
          lastError: item.last_error,
          submittedAt: item.submitted_at,
          createdAt: item.created_at,
        })),
        summary: {
          total: parseInt(summaryRow.total, 10) || 0,
          submitted: parseInt(summaryRow.submitted, 10) || 0,
          registered: parseInt(summaryRow.registered, 10) || 0,
          rejected: parseInt(summaryRow.rejected, 10) || 0,
          failed: parseInt(summaryRow.failed, 10) || 0,
        },
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('[MCHS_REGISTRATIONS_GET]', error);
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

    const operatorPartnerId = await getOperatorPartnerId(userOrResponse.userId);
    if (!operatorPartnerId) {
      return NextResponse.json(
        { success: false, error: 'Партнёрский профиль оператора не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const requestBody: unknown = await request.json();
    const validated = createMchsRegistrationSchema.parse(requestBody);

    const startDate = parseDateIso(validated.startDate);
    const endDate = parseDateIso(validated.endDate);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат дат' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, error: 'Дата начала не может быть позже даты окончания' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (validated.groupMembers.length !== validated.participantCount) {
      return NextResponse.json(
        { success: false, error: 'Количество участников должно совпадать с составом группы' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const mchsResult = await registerGroupWithMchs({
      groupName: validated.groupName,
      groupMembers: validated.groupMembers,
      routeDescription: validated.routeDescription,
      routeRegion: validated.routeRegion,
      startDate: validated.startDate,
      endDate: validated.endDate,
      guideContact: validated.guideContact,
      emergencyContacts: validated.emergencyContacts,
      participantCount: validated.participantCount,
    });

    const insertResult = await query<{
      id: string;
      status: string;
      mchs_request_id: string | null;
      created_at: string;
    }>(
      `INSERT INTO mchs_group_registrations (
         operator_partner_id,
         operator_user_id,
         group_name,
         group_members,
         route_description,
         route_region,
         start_date,
         end_date,
         guide_contact,
         emergency_contacts,
         participant_count,
         status,
         mchs_request_id,
         mchs_response,
         last_error,
         submitted_at,
         created_at,
         updated_at
       ) VALUES (
         $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14::jsonb, $15, $16, NOW(), NOW()
       )
       RETURNING id, status, mchs_request_id, created_at`,
      [
        operatorPartnerId,
        userOrResponse.userId,
        validated.groupName,
        JSON.stringify(validated.groupMembers),
        validated.routeDescription,
        validated.routeRegion || null,
        validated.startDate,
        validated.endDate,
        JSON.stringify(validated.guideContact),
        JSON.stringify(validated.emergencyContacts),
        validated.participantCount,
        mchsResult.status,
        mchsResult.requestId,
        JSON.stringify(mchsResult.responsePayload),
        mchsResult.errorMessage,
        mchsResult.status === 'submitted' || mchsResult.status === 'registered' ? new Date().toISOString() : null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: insertResult.rows[0].id,
          status: insertResult.rows[0].status,
          mchsRequestId: insertResult.rows[0].mchs_request_id,
          createdAt: insertResult.rows[0].created_at,
          mchsError: mchsResult.errorMessage,
        },
        message:
          mchsResult.status === 'failed'
            ? 'Регистрация сохранена, но отправка в МЧС не удалась'
            : 'Группа автоматически зарегистрирована в МЧС',
      } as ApiResponse<unknown>,
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    console.error('[MCHS_REGISTRATIONS_POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create MCHS registration' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
