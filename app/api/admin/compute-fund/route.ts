import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { getComputeFundStats } from '@/lib/compute-fund';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/compute-fund
 * Текущий баланс фонда AI-вычислений + статистика.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const stats = await getComputeFundStats();
    return NextResponse.json({ success: true, data: stats });
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка получения данных фонда' }, { status: 500 });
  }
}
