import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, Voucher, VoucherFormData } from '@/types';
import { requireAgent } from '@/lib/auth/middleware';
import { z } from 'zod';

const CreateVoucherSchema = z.object({
  name: z.string().min(1, 'Название ваучера обязательно'),
  description: z.string().optional(),
  code: z.string().min(1, 'Код ваучера обязателен'),
  discountType: z.string().min(1, 'Тип скидки обязателен'),
  discountValue: z.number({ coerce: true }).positive('Размер скидки должен быть положительным'),
  minPurchase: z.number({ coerce: true }).nonnegative().optional(),
  maxDiscount: z.number({ coerce: true }).positive().optional(),
  validFrom: z.string().min(1, 'Дата начала действия обязательна'),
  validTo: z.string().min(1, 'Дата окончания действия обязательна'),
  usageLimit: z.number({ coerce: true }).int().positive().optional(),
  applicableTours: z.array(z.string()).optional().default([]),
  applicableClients: z.array(z.string()).optional().default([]),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/vouchers - Получить ваучеры агента
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const agentId = userOrResponse.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // all, active, expired, used
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause = 'WHERE created_by = $1';
    const params: (string | number)[] = [agentId];

    if (status === 'active') {
      whereClause += ' AND is_active = true AND valid_to >= NOW()';
    } else if (status === 'expired') {
      whereClause += ' AND valid_to < NOW()';
    } else if (status === 'used') {
      whereClause += ' AND usage_limit IS NOT NULL AND used_count >= usage_limit';
    }

    const vouchersQuery = `
      SELECT
        id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        min_purchase,
        max_discount,
        valid_from,
        valid_to,
        usage_limit,
        used_count,
        is_active,
        applicable_tours,
        applicable_clients,
        created_by,
        created_at,
        updated_at
      FROM vouchers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);
    const vouchersResult = await query<{
      id: string; code: string; name: string; description: string | null;
      discount_type: string; discount_value: string; min_purchase: string | null;
      max_discount: string | null; valid_from: unknown; valid_to: unknown;
      usage_limit: string | null; used_count: string; is_active: boolean;
      applicable_tours: string | null; applicable_clients: string | null;
      created_by: string; created_at: unknown; updated_at: unknown;
    }>(vouchersQuery, params);

    const vouchers: Voucher[] = vouchersResult.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      discountType: row.discount_type,
      discountValue: parseFloat(row.discount_value),
      minPurchase: row.min_purchase ? parseFloat(row.min_purchase) : undefined,
      maxDiscount: row.max_discount ? parseFloat(row.max_discount) : undefined,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      usageLimit: row.usage_limit ? parseInt(row.usage_limit) : undefined,
      usedCount: parseInt(row.used_count),
      isActive: row.is_active,
      applicableTours: JSON.parse(row.applicable_tours || '[]'),
      applicableClients: JSON.parse(row.applicable_clients || '[]'),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        vouchers,
        total: vouchers.length
      }
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении ваучеров'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/agent/vouchers - Создать новый ваучер
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const agentId = userOrResponse.userId;

    const body = await request.json();
    const parsed = CreateVoucherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }
    const {
      name,
      description,
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      validFrom,
      validTo,
      usageLimit,
      applicableTours,
      applicableClients
    } = parsed.data;

    // Проверяем уникальность кода
    const existingVoucherQuery = `
      SELECT id FROM vouchers WHERE code = $1
    `;

    const existingResult = await query(existingVoucherQuery, [code]);
    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Ваучер с таким кодом уже существует'
      } as ApiResponse<null>, { status: 400 });
    }

    // Создаем ваучер
    const createVoucherQuery = `
      INSERT INTO vouchers (
        id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        min_purchase,
        max_discount,
        valid_from,
        valid_to,
        usage_limit,
        used_count,
        is_active,
        applicable_tours,
        applicable_clients,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
      RETURNING id, created_at
    `;

    const voucherResult = await query(createVoucherQuery, [
      code,
      name,
      description || null,
      discountType,
      discountValue,
      minPurchase || null,
      maxDiscount || null,
      validFrom,
      validTo,
      usageLimit || null,
      0, // used_count
      true, // is_active
      JSON.stringify(applicableTours || []),
      JSON.stringify(applicableClients || []),
      agentId
    ]);

    const newVoucher = voucherResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        voucherId: newVoucher.id,
        createdAt: newVoucher.created_at
      },
      message: 'Ваучер успешно создан'
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании ваучера'
    } as ApiResponse<null>, { status: 500 });
  }
}