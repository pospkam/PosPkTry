import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface PartnerRow {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  description: string | null;
  contact: Record<string, unknown>;
  rating: string;
  review_count: string;
  is_verified: boolean;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/admin/content/partners/[id]
 * Получение одного партнёра по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;

    const result = await query<PartnerRow>(
      `SELECT p.id, p.user_id, p.name, p.category, p.description,
              p.contact, p.rating, p.review_count, p.is_verified,
              p.created_at, p.updated_at,
              l.url as logo_url
       FROM partners p
       LEFT JOIN assets l ON p.logo_asset_id = l.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Партнёр не найден' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description ?? '',
        contact: row.contact ?? {},
        rating: parseFloat(row.rating) || 0,
        reviewCount: parseInt(row.review_count) || 0,
        isVerified: row.is_verified,
        logoUrl: row.logo_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки партнёра', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

const ALLOWED_CATEGORIES = new Set([
  'operator', 'guide', 'transfer', 'stay', 'gear', 'agent', 'souvenir', 'cars', 'restaurant',
]);

const UpdatePartnerSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  category: z.string().optional().default(''),
  description: z.string().optional().default(''),
  contact: z.record(z.string(), z.unknown()).optional().default({}),
  isVerified: z.boolean().optional(),
});

/**
 * PUT /api/admin/content/partners/[id]
 * Обновление партнёра администратором
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdatePartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }

    const { name, category, description, contact, isVerified } = parsed.data;

    if (category && !ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json(
        { success: false, error: 'Некорректная категория' },
        { status: 400 }
      );
    }

    // Build dynamic SET clause
    const setClauses: string[] = [];
    const values: (string | boolean | Record<string, unknown>)[] = [];
    let idx = 1;

    setClauses.push(`name = $${idx}`);
    values.push(name);
    idx++;

    if (category) {
      setClauses.push(`category = $${idx}`);
      values.push(category);
      idx++;
    }

    setClauses.push(`description = $${idx}`);
    values.push(description);
    idx++;

    setClauses.push(`contact = $${idx}`);
    values.push(JSON.stringify(contact));
    idx++;

    if (isVerified !== undefined) {
      setClauses.push(`is_verified = $${idx}`);
      values.push(isVerified);
      idx++;
    }

    setClauses.push('updated_at = NOW()');

    values.push(id);
    const idIdx = idx;

    const result = await query(
      `UPDATE partners SET ${setClauses.join(', ')} WHERE id = $${idIdx} RETURNING id`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Партнёр не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Партнёр обновлён' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка обновления', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/content/partners/[id]
 * Удаление партнёра
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;

    const result = await query(
      'DELETE FROM partners WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Партнёр не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Партнёр удалён' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка удаления', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
