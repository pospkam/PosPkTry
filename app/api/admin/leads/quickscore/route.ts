/**
 * POST /api/admin/leads/quickscore
 * Быстрый rule-based скоринг лидов без AI (ai_score IS NULL)
 * Не требует AI провайдера — мгновенно
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { computeQuickScore } from '@/lib/leads/scoring';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const unscored = await pool.query<{
    id: string; name: string; phone: string;
    comment: string | null; source_data: Record<string, unknown> | null;
  }>(
    `SELECT id, name, phone, comment, source_data
     FROM leads WHERE ai_score IS NULL ORDER BY created_at DESC LIMIT 100`
  );

  if (unscored.rows.length === 0) {
    return NextResponse.json({ updated: 0, message: 'Все лиды уже оценены' });
  }

  // Считаем все скоры синхронно (pure function), потом один batch UPDATE
  const scored = unscored.rows.map(row => ({
    id: row.id,
    score: computeQuickScore(row.name, row.phone, row.comment, row.source_data),
  }));

  await pool.query(
    `UPDATE leads SET ai_score = v.score
     FROM (SELECT UNNEST($1::uuid[]) AS id, UNNEST($2::int[]) AS score) v
     WHERE leads.id = v.id`,
    [scored.map(r => r.id), scored.map(r => r.score)],
  );

  return NextResponse.json({ updated: scored.length, message: `Обновлено ${scored.length} лидов` });
}
