/**
 * POST /api/admin/intel/inject
 * Ручной инжект статьи / новости в базу знаний Intelligence Monitor.
 *
 * Body:
 *   content  string  — текст статьи (до 8000 символов)
 *   topic    string  — заголовок / тема
 *   domain   string  — 'ai_tech' | 'travel_industry' | 'competitors'
 *
 * AI анализирует контент, извлекает action_items, сохраняет в agent_memory.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { injectManualIntel } from '@/lib/services/intelligence-monitor.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Schema = z.object({
  content: z.string().min(50).max(8000),
  topic:   z.string().min(1).max(200),
  domain:  z.enum(['ai_tech', 'travel_industry', 'competitors']).default('ai_tech'),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Невалидный JSON' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }, { status: 400 });
  }

  const { content, topic, domain } = parsed.data;

  try {
    const result = await injectManualIntel(content, topic, domain);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
