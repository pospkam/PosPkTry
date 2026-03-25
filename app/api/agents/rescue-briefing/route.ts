/**
 * GET /api/agents/rescue-briefing?type=sos|weather|protocols
 *
 * Брифинг AI Спасателя для Safety Dashboard.
 * Вызывает RescueAgency с нужным интентом и возвращает отчёт.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { getModelForAgent } from '@/lib/ai/agent-models';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['sos', 'weather', 'protocols'] as const;
type BriefingType = typeof VALID_TYPES[number];

const INTENT_MAP: Record<BriefingType, string> = {
  sos:       'rescue_sos_stats',
  weather:   'rescue_weather_risk',
  protocols: 'rescue_protocols',
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const type = (req.nextUrl.searchParams.get('type') ?? 'sos') as BriefingType;

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Неверный тип брифинга. Доступно: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const intent = INTENT_MAP[type];
  const start  = Date.now();

  try {
    const { RescueAgency } = await import('@/lib/agents/agencies/rescue-agency');
    const agency = new RescueAgency();

    // Минимальный контекст агента
    const ctx = {
      user: { userId: 'system', email: 'system', role: 'admin' },
      platform_metrics: {},
      preferredModel: getModelForAgent('rescue'),
    };

    const result = await agency.run(intent, ctx as unknown as Parameters<typeof agency.run>[1]);

    return NextResponse.json({
      success:     true,
      type,
      intent,
      response:    result.response,
      data:        result.data ?? {},
      duration_ms: Date.now() - start,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: msg, duration_ms: Date.now() - start },
      { status: 500 }
    );
  }
}
