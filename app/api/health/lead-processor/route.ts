/**
 * Health Check — AI Lead Processor
 * Проверяет все компоненты пайплайна лидов
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// AUTH: Public — infra health check, no sensitive data exposed
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. DB — lead_proposals table
  try {
    await pool.query('SELECT 1 FROM lead_proposals LIMIT 1');
    checks.db_lead_proposals = { ok: true };
  } catch (e) {
    checks.db_lead_proposals = { ok: false, detail: e instanceof Error ? e.message : 'unknown' };
  }

  // 2. DB — leads table has AI columns
  try {
    await pool.query('SELECT ai_score, ai_summary, processed_at FROM leads LIMIT 1');
    checks.db_leads_ai_columns = { ok: true };
  } catch (e) {
    checks.db_leads_ai_columns = { ok: false, detail: e instanceof Error ? e.message : 'unknown' };
  }

  // 3. AI provider — OpenRouter key present
  const orKey = process.env.OR_API_KEY || process.env.OPENROUTER_API_KEY;
  checks.ai_provider_key = { ok: !!orKey };

  // 4. Telegram bot token present
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  checks.telegram_token = { ok: !!tgToken };

  // 5. Pending leads count (informational)
  try {
    const { rows } = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM leads WHERE status = 'new'"
    );
    checks.pending_leads = { ok: true, detail: `${rows[0].count} pending` };
  } catch (e) {
    checks.pending_leads = { ok: false, detail: e instanceof Error ? e.message : 'unknown' };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const coreOk = checks.db_lead_proposals?.ok && checks.db_leads_ai_columns?.ok;

  const status = allOk ? 'ok' : coreOk ? 'degraded' : 'error';

  return NextResponse.json(
    { status, checks, timestamp: new Date().toISOString() },
    { status: status === 'error' ? 503 : 200 }
  );
}
