/**
 * POST /api/agents/operator-verdict
 *
 * Bull/Bear анализ оператора(ов) — 5 быков vs 5 медведей.
 * Вердикт: promote / hold / warn / suspend.
 *
 * Body (опционально): { operator_id: string }
 * Если operator_id не указан — анализирует топ-5 операторов по активности.
 *
 * AUTH: только admin.
 * READ ONLY — не меняет данные.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { OperatorVerdictAgency } from '@/lib/agents/agencies/operator-verdict-agency';

export const dynamic     = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let operatorId: string | undefined;
  try {
    const body = await req.json().catch(() => ({})) as { operator_id?: string };
    operatorId = typeof body.operator_id === 'string' && body.operator_id.trim()
      ? body.operator_id.trim()
      : undefined;
  } catch { /* operatorId remains undefined */ }

  const started = Date.now();

  try {
    const agency = new OperatorVerdictAgency();
    const results = await agency.run(operatorId);

    return NextResponse.json({
      ok:       true,
      count:    results.length,
      ms:       Date.now() - started,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Неизвестная ошибка' },
      { status: 500 }
    );
  }
}
