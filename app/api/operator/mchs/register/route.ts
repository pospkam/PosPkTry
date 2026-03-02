import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

// -- Zod-схемы для валидации входных данных --

const groupMemberSchema = z.object({
  fullName: z.string().min(2).max(150),
  phone: z.string().max(30).optional(),
  birthDate: z.string().max(30).optional(),
});

const guideContactSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().min(5).max(30),
});

const emergencyContactSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().min(5).max(30),
  relation: z.string().max(100).optional(),
});

const createRegistrationSchema = z.object({
  bookingId: z.string().uuid(),
  groupComposition: z.array(groupMemberSchema).min(1).max(100),
  route: z.string().min(3).max(5000),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  guideContacts: guideContactSchema,
  emergencyContacts: z.array(emergencyContactSchema).min(1).max(20),
}).superRefine((data, ctx) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (Number.isNaN(start.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startDate'],
      message: 'Неверный формат даты начала',
    });
  }

  if (Number.isNaN(end.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'Неверный формат даты окончания',
    });
  }

  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'Дата окончания не может быть раньше даты начала',
    });
  }
});

// -- Типы для строк из БД --

type MchsStatus = 'pending' | 'submitted' | 'confirmed' | 'rejected';

interface MchsRegistrationListRow {
  id: string;
  booking_id: string;
  route: string;
  start_date: string;
  end_date: string;
  status: MchsStatus;
  mchs_reference: string | null;
  created_at: string;
  updated_at: string;
}

interface MchsSummaryRow {
  total: string;
  pending: string;
  submitted: string;
  confirmed: string;
  rejected: string;
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/operator/mchs/register
 * Получение списка регистраций МЧС для текущего оператора
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    // operator_id из JWT-сессии, привязка через partners
    const operatorId = await getOperatorPartnerId(userOrResponse.userId);
    if (!operatorId) {
      return NextResponse.json(
        { success: false, error: 'Партнёрский профиль оператора не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = listQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: queryValidation.error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { limit } = queryValidation.data;

    // Фильтрация только по operator_id текущего пользователя
    const listResult = await query<MchsRegistrationListRow>(
      `SELECT
         id,
         booking_id,
         route,
         start_date,
         end_date,
         status,
         mchs_reference,
         created_at,
         updated_at
       FROM mchs_registrations
       WHERE operator_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [operatorId, limit]
    );

    // Сводка по статусам для dashboard-виджета
    const summaryResult = await query<MchsSummaryRow>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
         COUNT(*) FILTER (WHERE status = 'submitted')::text AS submitted,
         COUNT(*) FILTER (WHERE status = 'confirmed')::text AS confirmed,
         COUNT(*) FILTER (WHERE status = 'rejected')::text AS rejected
       FROM mchs_registrations
       WHERE operator_id = $1`,
      [operatorId]
    );

    const summary = summaryResult.rows[0] ?? {
      total: '0',
      pending: '0',
      submitted: '0',
      confirmed: '0',
      rejected: '0',
    };

    return NextResponse.json({
      success: true,
      data: {
        registrations: listResult.rows.map(row => ({
          id: row.id,
          bookingId: row.booking_id,
          route: row.route,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.status,
          mchsReference: row.mchs_reference,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        summary: {
          total: Number.parseInt(summary.total, 10) || 0,
          pending: Number.parseInt(summary.pending, 10) || 0,
          submitted: Number.parseInt(summary.submitted, 10) || 0,
          confirmed: Number.parseInt(summary.confirmed, 10) || 0,
          rejected: Number.parseInt(summary.rejected, 10) || 0,
        },
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('[OPERATOR_MCHS_REGISTER_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Не удалось загрузить регистрации МЧС' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/operator/mchs/register
 * Создание новой регистрации группы в МЧС
 * operator_id берётся из JWT-сессии, никогда из тела запроса
 */
export async function POST(request: NextRequest) {
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

    const payload: unknown = await request.json();
    const validation = createRegistrationSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const data = validation.data;

    // Проверка владения бронированием: оператор может регистрировать
    // только группы по своим бронированиям (через tours.operator_id)
    const ownershipResult = await query<{ id: string }>(
      `SELECT b.id
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       WHERE b.id = $1 AND t.operator_id = $2
       LIMIT 1`,
      [data.bookingId, operatorId]
    );

    if (ownershipResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Бронирование не найдено или недоступно' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Начальный статус — pending (МЧС API интеграция в Phase 2)
    const insertResult = await query<{
      id: string;
      status: MchsStatus;
      created_at: string;
    }>(
      `INSERT INTO mchs_registrations (
         booking_id,
         operator_id,
         group_composition,
         route,
         start_date,
         end_date,
         guide_contacts,
         emergency_contacts,
         status,
         created_at,
         updated_at
       ) VALUES (
         $1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, $8::jsonb,
         'pending', now(), now()
       )
       RETURNING id, status, created_at`,
      [
        data.bookingId,
        operatorId,
        JSON.stringify(data.groupComposition),
        data.route,
        data.startDate,
        data.endDate,
        JSON.stringify(data.guideContacts),
        JSON.stringify(data.emergencyContacts),
      ]
    );

    const created = insertResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created.id,
          bookingId: data.bookingId,
          status: created.status,
          createdAt: created.created_at,
        },
        message: 'Заявка на регистрацию группы в МЧС создана',
      } as ApiResponse<unknown>,
      { status: 201 }
    );
  } catch (error) {
    console.error('[OPERATOR_MCHS_REGISTER_POST]', error);
    return NextResponse.json(
      { success: false, error: 'Не удалось создать регистрацию МЧС' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
