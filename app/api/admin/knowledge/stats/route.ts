import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import type {
  TotalRow,
  KnowledgeCategoryStatsRow,
  KnowledgeSourceStatsRow,
} from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/knowledge/stats
 * Агрегированная статистика по базе знаний
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    let totalRoutes = 0;
    let embeddedCount = 0;
    let categories: Array<{ category: string; count: number }> = [];
    let sources: Array<{ source: string; count: number }> = [];

    try {
      const r = await query<TotalRow>('SELECT COUNT(*) as total FROM agent_route_knowledge', []);
      totalRoutes = parseInt(r.rows[0]?.total ?? '0', 10);
    } catch { /* 0 */ }

    try {
      const r = await query<TotalRow>(
        'SELECT COUNT(*) as total FROM agent_route_knowledge WHERE embedding IS NOT NULL',
        []
      );
      embeddedCount = parseInt(r.rows[0]?.total ?? '0', 10);
    } catch { /* 0 */ }

    try {
      const r = await query<KnowledgeCategoryStatsRow>(
        `SELECT category, COUNT(*) as count
         FROM agent_route_knowledge
         GROUP BY category
         ORDER BY count DESC`,
        []
      );
      categories = r.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count, 10),
      }));
    } catch { /* empty */ }

    try {
      const r = await query<KnowledgeSourceStatsRow>(
        `SELECT source_name, COUNT(*) as count
         FROM agent_route_knowledge
         GROUP BY source_name
         ORDER BY count DESC`,
        []
      );
      sources = r.rows.map(row => ({
        source: row.source_name ?? 'unknown',
        count: parseInt(row.count, 10),
      }));
    } catch { /* empty */ }

    return NextResponse.json({
      success: true,
      data: { totalRoutes, embeddedCount, categories, sources },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки статистики' },
      { status: 500 }
    );
  }
}
