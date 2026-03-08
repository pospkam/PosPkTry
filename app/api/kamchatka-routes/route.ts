/**
 * GET /api/kamchatka-routes
 * Публичный список маршрутов из v_kamchatka_routes_api.
 * Используется в форме создания тура для выбора базового маршрута.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (category) {
      conditions.push(`category = $${idx++}`);
      params.push(category);
    }

    if (search) {
      conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const result = await query(
      `SELECT id, title, category, description, lat, lng, source_url, source_name
       FROM v_kamchatka_routes_api
       ${where}
       ORDER BY category, title
       LIMIT $${idx}`,
      params
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map(r => ({
        id: r.id as string,
        title: r.title as string,
        category: r.category as string,
        description: (r.description as string | null) ?? '',
        lat: r.lat != null ? parseFloat(r.lat as string) : null,
        lng: r.lng != null ? parseFloat(r.lng as string) : null,
        sourceUrl: (r.source_url as string | null) ?? null,
        sourceName: (r.source_name as string | null) ?? null,
      })),
      total: result.rows.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки маршрутов', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}
