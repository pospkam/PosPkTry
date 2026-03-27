/**
 * POST /api/admin/leads/quickscore
 * Быстрый rule-based скоринг лидов без AI (ai_score IS NULL)
 * Не требует AI провайдера — мгновенно
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

function computeQuickScore(
  name: string,
  phone: string,
  comment: string | null,
  sourceData: Record<string, unknown> | null,
): number {
  if (/^Турист_\d+$/i.test(name)) return 5;
  if (name.trim().length < 3) return 5;

  let score = 0;

  // Имя (25)
  if (/\s/.test(name.trim())) score += 25;
  else score += 15;

  // Телефон (20)
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) score += 20;
  else score += 5;

  // Комментарий (40)
  if (comment) {
    const len = comment.trim().length;
    if (len > 80) score += 20;
    else if (len > 30) score += 12;
    else if (len > 10) score += 5;
    if (/\d{3,}/.test(comment)) score += 10;
    if (/бюджет|руб|₽|чел|человек|дн[её]|ночь|недел/i.test(comment)) score += 10;
  }

  // Источник (15)
  const src = (sourceData as Record<string, string> | null)?.source;
  if (src === 'trip_planner') score += 15;
  else if (src === 'homepage_cta') score += 10;
  else if (src === 'route_page') score += 12;

  return Math.min(100, score);
}

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

  let updated = 0;
  for (const row of unscored.rows) {
    const score = computeQuickScore(row.name, row.phone, row.comment, row.source_data);
    await pool.query(`UPDATE leads SET ai_score = $1 WHERE id = $2`, [score, row.id]);
    updated++;
  }

  return NextResponse.json({ updated, message: `Обновлено ${updated} лидов` });
}
