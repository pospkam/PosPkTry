import { safeMsg } from '@/lib/errors/sanitize';
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
  short_description: string | null;
  slug: string | null;
  hero_image: string | null;
  logo_image: string | null;
  location: Record<string, unknown> | null;
  is_public: boolean;
  contact: Record<string, unknown>;
  rating: string;
  review_count: string;
  is_verified: boolean;
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
      `SELECT id, user_id, name, category, description,
              short_description, slug, hero_image, logo_image,
              location, is_public, contact, rating, review_count,
              is_verified, created_at, updated_at
       FROM partners
       WHERE id = $1`,
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
        shortDescription: row.short_description ?? '',
        slug: row.slug ?? '',
        heroImage: row.hero_image ?? '',
        logoImage: row.logo_image ?? '',
        location: row.location ?? {},
        isPublic: row.is_public ?? false,
        contact: row.contact ?? {},
        rating: parseFloat(row.rating) || 0,
        reviewCount: parseInt(row.review_count) || 0,
        isVerified: row.is_verified,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки партнёра', details: safeMsg(error) },
      { status: 500 }
    );
  }
}

const ALLOWED_CATEGORIES = new Set([
  'operator', 'guide', 'transfer', 'agent', 'restaurant',
]);

const UpdatePartnerSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  category: z.string().optional().default(''),
  description: z.string().optional().default(''),
  shortDescription: z.string().optional().default(''),
  slug: z.string().optional().default(''),
  heroImage: z.string().optional().default(''),
  logoImage: z.string().optional().default(''),
  location: z.object({
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
  }).optional().default({}),
  contact: z.record(z.string(), z.unknown()).optional().default({}),
  isVerified: z.boolean().optional(),
  isPublic: z.boolean().optional(),
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

    const { name, category, description, shortDescription, slug, heroImage, logoImage, location, contact, isVerified, isPublic } = parsed.data;

    if (category && !ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json(
        { success: false, error: 'Некорректная категория' },
        { status: 400 }
      );
    }

    // Build dynamic SET clause
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    setClauses.push(`name = $${idx}`); values.push(name); idx++;
    if (category) { setClauses.push(`category = $${idx}`); values.push(category); idx++; }
    setClauses.push(`description = $${idx}`); values.push(description); idx++;
    setClauses.push(`short_description = $${idx}`); values.push(shortDescription); idx++;
    if (slug) { setClauses.push(`slug = $${idx}`); values.push(slug); idx++; }
    setClauses.push(`hero_image = $${idx}`); values.push(heroImage || null); idx++;
    setClauses.push(`logo_image = $${idx}`); values.push(logoImage || null); idx++;
    setClauses.push(`location = $${idx}`); values.push(JSON.stringify(location)); idx++;
    setClauses.push(`contact = $${idx}`); values.push(JSON.stringify(contact)); idx++;
    if (isVerified !== undefined) { setClauses.push(`is_verified = $${idx}`); values.push(isVerified); idx++; }
    if (isPublic !== undefined) { setClauses.push(`is_public = $${idx}`); values.push(isPublic); idx++; }

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
      { success: false, error: 'Ошибка обновления', details: safeMsg(error) },
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
      { success: false, error: 'Ошибка удаления', details: safeMsg(error) },
      { status: 500 }
    );
  }
}
