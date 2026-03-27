import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

// Публичный лёгкий трекинг визитов хаба безопасности
// Пишем в ai_actions_log для Rescue агента (board meeting)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { tab?: string };
    const tab = typeof body.tab === 'string' ? body.tab.slice(0, 30) : 'sos';

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata)
       VALUES ('safety_hub_visit', $1::jsonb)`,
      [JSON.stringify({ tab, ip_hash: ip.slice(-4), ts: new Date().toISOString() })]
    );
  } catch {
    // Тихая ошибка — не влияет на пользователя
  }
  return NextResponse.json({ ok: true });
}
