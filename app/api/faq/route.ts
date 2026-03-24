import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  priority: number;
  views: number;
  helpful: number;
}

// GET /api/faq — public FAQ list
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.trim();

  try {
    const params: string[] = [];
    const conditions: string[] = [];
    let idx = 1;

    if (category) {
      conditions.push(`category = $${idx}`);
      params.push(category);
      idx++;
    }

    if (search) {
      conditions.push(`(question ILIKE $${idx} OR answer ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await query<FaqRow>(
      `SELECT id, question, answer, category, priority, views, helpful
       FROM faqs ${where}
       ORDER BY priority ASC, views DESC, id
       LIMIT 100`,
      params
    );

    // Get categories
    const catResult = await query<{ category: string; count: string }>(
      `SELECT category, COUNT(*) as count FROM faqs WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC`,
      []
    );

    return NextResponse.json({
      success: true,
      data: {
        items: result.rows,
        categories: catResult.rows,
      },
    });
  } catch (error) {
    const msg = safeMsg(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
