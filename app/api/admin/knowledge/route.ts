import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import type {
  KnowledgeRouteRow,
  TotalRow,
} from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/knowledge
 * Список маршрутов из agent_route_knowledge с FTS-поиском и фильтром
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (category) {
      conditions.push(`category = $${paramIdx++}`);
      params.push(category);
    }
    if (search) {
      conditions.push(`to_tsvector('russian', title) @@ plainto_tsquery('russian', $${paramIdx++})`);
      params.push(search);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await query<TotalRow>(
      `SELECT COUNT(*) as total FROM agent_route_knowledge ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    // Data
    const dataParams = [...params, limit, offset];
    const limitParam = paramIdx++;
    const offsetParam = paramIdx;

    const result = await query<KnowledgeRouteRow>(
      `SELECT id, title, category, description, source_url, source_name,
              lat, lng,
              payload->>'difficulty' as difficulty,
              payload->>'duration' as duration,
              payload->>'season' as season,
              payload->>'price_from' as price_from,
              (embedding IS NOT NULL) as has_embedding,
              created_at, updated_at
       FROM agent_route_knowledge
       ${whereClause}
       ORDER BY title ASC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      dataParams
    );

    return NextResponse.json({
      success: true,
      data: {
        routes: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки базы знаний' },
      { status: 500 }
    );
  }
}
