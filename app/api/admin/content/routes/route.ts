import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import type { TotalRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content/routes
 * Список маршрутов из agent_route_knowledge с поиском, фильтром категории и видимости.
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const category   = searchParams.get('category');
    const search     = searchParams.get('search');
    const visibility = searchParams.get('visibility'); // 'visible' | 'hidden' | null
    const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)));
    const offset     = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;

    if (category) {
      conditions.push(`category = $${idx++}`);
      params.push(category);
    }
    if (search) {
      conditions.push(`title ILIKE $${idx++}`);
      params.push(`%${search}%`);
    }
    if (visibility === 'visible') conditions.push('is_visible = TRUE');
    else if (visibility === 'hidden') conditions.push('is_visible = FALSE');

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<TotalRow>(
      `SELECT COUNT(*) AS total FROM agent_route_knowledge ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    const dataResult = await query<{
      id: string;
      title: string;
      category: string;
      source_name: string | null;
      lat: string | null;
      lng: string | null;
      is_visible: boolean;
      created_at: Date;
    }>(
      `SELECT id, title, category, source_name, lat, lng, is_visible, created_at
       FROM agent_route_knowledge
       ${where}
       ORDER BY is_visible DESC, category ASC, title ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: dataResult.rows.map(r => ({
        id:         r.id,
        title:      r.title,
        category:   r.category,
        sourceName: r.source_name,
        hasCoords:  r.lat != null && r.lng != null,
        isVisible:  r.is_visible,
        createdAt:  r.created_at,
      })),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки маршрутов' },
      { status: 500 }
    );
  }
}
