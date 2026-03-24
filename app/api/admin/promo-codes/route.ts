import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';

const CreatePromoCodeSchema = z.object({
  code: z.string().min(1, 'Код промокода обязателен'),
  discountType: z.enum(['percentage', 'fixed'], { errorMap: () => ({ message: 'Тип скидки: percentage или fixed' }) }),
  discountValue: z.number({ coerce: true }).positive('Размер скидки должен быть положительным'),
  maxUses: z.number({ coerce: true }).int().positive('Максимальное число использований должно быть положительным'),
  expiresAt: z.string().nullable().optional().default(null),
});

export const dynamic = 'force-dynamic';

interface PromoRow {
  id: string;
  code: string;
  discount_type: string;
  discount_value: string;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  creator_email: string | null;
}

// GET /api/admin/promo-codes — list all promo codes
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await query<PromoRow>(
      `SELECT pc.*, u.email as creator_email
       FROM promo_codes pc
       LEFT JOIN users u ON pc.created_by = u.id
       ORDER BY pc.created_at DESC`,
      []
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    const msg = safeMsg(error);
    return NextResponse.json({ success: false, error: `Ошибка: ${msg}` }, { status: 500 });
  }
}

// POST /api/admin/promo-codes — create promo code
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = CreatePromoCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' }, { status: 400 });
    }
    const { code, discountType, discountValue, maxUses, expiresAt } = parsed.data;

    const id = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    await query(
      `INSERT INTO promo_codes (id, code, discount_type, discount_value, max_uses, current_uses, expires_at, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, 0, $6, true, $7)`,
      [id, code.toUpperCase(), discountType, discountValue, maxUses, expiresAt ?? null, auth.userId]
    );

    return NextResponse.json({ success: true, data: { id, code: code.toUpperCase() }, message: 'Промокод создан' }, { status: 201 });
  } catch (error) {
    const msg = safeMsg(error);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ success: false, error: 'Промокод с таким кодом уже существует' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: `Ошибка: ${msg}` }, { status: 500 });
  }
}

// DELETE /api/admin/promo-codes — deactivate promo code
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID обязателен' }, { status: 400 });
    }

    await query(`UPDATE promo_codes SET is_active = false WHERE id = $1`, [id]);

    return NextResponse.json({ success: true, message: 'Промокод деактивирован' });
  } catch (error) {
    const msg = safeMsg(error);
    return NextResponse.json({ success: false, error: `Ошибка: ${msg}` }, { status: 500 });
  }
}
