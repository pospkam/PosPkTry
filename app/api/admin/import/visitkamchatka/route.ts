/**
 * POST /api/admin/import/visitkamchatka
 * Импорт официальных маршрутов Камчатки с visitkamchatka.ru
 *
 * Записывает в:
 *   - kamchatka_routes     (публичный каталог)
 *   - agent_route_knowledge (база знаний Кузьмича)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { importVisitKamchatka } from '@/lib/services/visitkamchatka-importer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await importVisitKamchatka();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
