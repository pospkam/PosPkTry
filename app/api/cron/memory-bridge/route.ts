/**
 * GET /api/cron/memory-bridge
 *
 * Синхронизирует агрегированные предпочтения туристов из user_ai_memory
 * в agent_memory для доступа агентами (Planning, Hacker, Content, Admin).
 *
 * Запускать: каждые 6 часов
 * Защита: ?secret=CRON_SECRET
 *
 * cron-job.org:
 *   https://tourhab.ru/api/cron/memory-bridge?secret=SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncUserDemandToAgentMemory } from '@/lib/agents/memory/memory-bridge';
import { timingSafeCompare } from '@/lib/security/timing-safe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
    ?? request.nextUrl.searchParams.get('secret');

  if (!timingSafeCompare(secret, process.env.CRON_SECRET ?? '')) {
    return NextResponse.json({ error: 'Неавторизованный доступ' }, { status: 401 });
  }

  try {
    const result = await syncUserDemandToAgentMemory();
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
