import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { preflightProviders } from '@/lib/ai/providers';
import { getComputeFundStats } from '@/lib/compute-fund';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/board-meeting/preflight
 * Быстрая проверка доступности AI-провайдеров + баланс фонда токенов.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const [result, fund] = await Promise.all([
    preflightProviders(),
    getComputeFundStats().catch(() => null),
  ]);

  return NextResponse.json({
    success: true,
    ...result,
    compute_fund: fund ? {
      total_rub:         fund.total_contributed_rub,
      estimated_meetings: fund.estimated_meetings,
      estimated_chats:    fund.estimated_chats,
    } : null,
  });
}
