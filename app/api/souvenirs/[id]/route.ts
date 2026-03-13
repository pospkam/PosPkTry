import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const UpdatePublicSouvenirSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().optional(),
});

// GET /api/souvenirs/[id] - Public
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query<{ id: string; price: string; images: string | null; tags: string | null; [key: string]: unknown }>(
      'SELECT * FROM souvenirs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Сувенир не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const souvenir = {
      ...result.rows[0],
      price: parseFloat(result.rows[0].price),
      images: JSON.parse(result.rows[0].images || '[]'),
      tags: JSON.parse(result.rows[0].tags || '[]')
    };

    return NextResponse.json({
      success: true,
      data: { souvenir }
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

// PUT /api/souvenirs/[id] - Admin only
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdatePublicSouvenirSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }

    const { name, description, price } = parsed.data;

    await query(`
      UPDATE souvenirs
      SET name = COALESCE($1, name), description = COALESCE($2, description), price = COALESCE($3, price), updated_at = NOW()
      WHERE id = $4
    `, [name, description, price, id]);

    return NextResponse.json({
      success: true,
      message: 'Обновлено'
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

// DELETE /api/souvenirs/[id] - Admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;
    await query('UPDATE souvenirs SET is_active = false WHERE id = $1', [id]);
    return NextResponse.json({
      success: true,
      message: 'Удалено'
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

