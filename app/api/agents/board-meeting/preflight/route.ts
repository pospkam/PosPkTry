import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { preflightProviders } from '@/lib/ai/providers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/board-meeting/preflight
 * Быстрая проверка доступности AI-провайдеров перед совещанием.
 * Если ни один не отвечает — предупредить директора ДО запуска.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const result = await preflightProviders();

  return NextResponse.json({
    success: true,
    ...result,
  });
}
