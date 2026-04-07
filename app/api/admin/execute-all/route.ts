/**
 * app/api/admin/execute-all/route.ts
 *
 * ONE-SHOT BATCH EXECUTOR
 * Запускает ВСЕ одобренные инициативы немедленно.
 *
 * GET /api/admin/execute-all?secret=CRON_SECRET&hours=12
 *
 * 1. Auto-migrates DB (adds missing columns) — идемпотентно (IF NOT EXISTS)
 * 2. Backfill: все старые approved → execution_status='assigned'
 * 3. Выполняет все assigned инициативы (без лимита 5)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { executeInitiative } from '@/lib/agents/execution/initiative-executor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 минут — может быть много инициатив

async function notifyOwner(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch {
    /* silent */
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hours = parseInt(req.nextUrl.searchParams.get('hours') ?? '12', 10);
  const force = req.nextUrl.searchParams.get('force') === '1';
  const statsOnly = req.nextUrl.searchParams.get('stats') === '1';
  const log: string[] = [];

  // ── STATS-ONLY MODE ───────────────────────────────────────────────────────
  if (statsOnly) {
    try {
      const [meetingsRes, approvalsRes] = await Promise.all([
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'completed') AS completed,
             COUNT(*) FILTER (WHERE status = 'running')   AS running,
             COUNT(*) AS total,
             MIN(started_at) AS first_at,
             MAX(started_at) AS last_at
           FROM board_meeting_sessions
           WHERE started_at > NOW() - ($1 || ' hours')::interval`,
          [hours]
        ),
        pool.query(
          `SELECT status, COUNT(*) as cnt
           FROM agent_approvals
           GROUP BY status`
        ),
      ]);
      const meetings = meetingsRes.rows[0];
      const approvals: Record<string, number> = {};
      for (const r of approvalsRes.rows) {
        approvals[r.status] = parseInt(r.cnt);
      }
      return NextResponse.json({
        period_hours: hours,
        meetings: {
          total:     parseInt(meetings.total),
          completed: parseInt(meetings.completed),
          running:   parseInt(meetings.running),
          first_at:  meetings.first_at,
          last_at:   meetings.last_at,
        },
        approvals,
      });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  // ── STEP 1: AUTO-MIGRATE ──────────────────────────────────────────────────
  try {
    await pool.query(`
      ALTER TABLE agent_approvals
        ADD COLUMN IF NOT EXISTS executor_agent_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS executor_name     VARCHAR(100),
        ADD COLUMN IF NOT EXISTS execution_status  VARCHAR(20)
          CHECK (execution_status IN ('assigned','in_progress','done','failed')),
        ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS due_date          DATE;

      CREATE INDEX IF NOT EXISTS idx_agent_approvals_execution
        ON agent_approvals(execution_status, executor_agent_id)
        WHERE execution_status = 'assigned';
    `);
    log.push('migration: columns added/verified OK');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.push(`migration warning: ${msg}`);
    // Продолжаем — колонки могут уже существовать
  }

  // ── STEP 2: BACKFILL — старые approved без execution_status ──────────────
  try {
    const backfillResult = await pool.query(`
      UPDATE agent_approvals
      SET execution_status = 'assigned',
          approved_at = COALESCE(reviewed_at, NOW())
      WHERE status = 'approved'
        AND (execution_status IS NULL OR execution_status = '' OR execution_status = 'pending')
      RETURNING id
    `);
    log.push(`backfill: ${backfillResult.rowCount} old approved → assigned`);
  } catch (err) {
    log.push(`backfill error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── STEP 2b: FORCE MODE — одобрить ВСЕ pending (owner command) ───────────
  if (force) {
    try {
      const forceResult = await pool.query(`
        UPDATE agent_approvals
        SET status = 'approved',
            execution_status = 'assigned',
            reviewed_at = NOW(),
            review_notes = 'Force-approved by owner via execute-all'
        WHERE status = 'pending'
          AND (expires_at IS NULL OR expires_at > NOW())
        RETURNING id, action_type
      `);
      log.push(`force-approve: ${forceResult.rowCount ?? 0} pending → approved+assigned`);
      if ((forceResult.rowCount ?? 0) > 0) {
        const list = forceResult.rows.map((r: { id: string; action_type: string }) => r.action_type).join(', ');
        log.push(`force-approved types: ${list}`);
      }
    } catch (err) {
      log.push(`force-approve error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── STEP 3: LOAD INITIATIVES ──────────────────────────────────────────────
  let initiatives: Array<{
    id: string;
    action_type: string;
    description: string;
    context: Record<string, unknown>;
    executor_agent_id: string;
    executor_name: string;
    due_date: string;
    created_at: string;
  }> = [];

  try {
    const result = await pool.query(
      `SELECT
         id, action_type, description, context,
         executor_agent_id, executor_name, due_date, created_at
       FROM agent_approvals
       WHERE status = 'approved'
         AND execution_status = 'assigned'
         AND executor_agent_id IS NOT NULL
         AND created_at >= NOW() - ($1 || ' hours')::interval
       ORDER BY created_at ASC`,
      [hours]
    );
    initiatives = result.rows;
    log.push(`found: ${initiatives.length} initiatives (last ${hours}h)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg, log }, { status: 500 });
  }

  if (initiatives.length === 0) {
    // Диагностика: покажем что вообще есть в таблице
    let stats: Record<string, number> = {};
    try {
      const statsResult = await pool.query(
        `SELECT status, COUNT(*) as cnt FROM agent_approvals GROUP BY status`
      );
      stats = Object.fromEntries(statsResult.rows.map((r: { status: string; cnt: string }) => [r.status, parseInt(r.cnt)]));
    } catch { /* ignore */ }

    await notifyOwner(
      `Batch executor: за ${hours}ч нет инициатив для исполнения.\nСостояние БД: ${JSON.stringify(stats)}\nHint: добавь ?force=1 чтобы одобрить все pending`
    );
    return NextResponse.json({ success: true, executed: 0, log, db_stats: stats });
  }

  // ── STEP 4: EXECUTE ALL ───────────────────────────────────────────────────
  const results: Array<{
    id: string;
    action_type: string;
    executor: string;
    success: boolean;
    changes: number;
    errors: number;
    ms: number;
    error?: string;
  }> = [];

  for (const initiative of initiatives) {
    const t0 = Date.now();
    try {
      const result = await executeInitiative({
        approval_id: initiative.id,
        executor_agent_id: initiative.executor_agent_id,
        action_type: initiative.action_type,
        description: initiative.description,
        context: initiative.context ?? {},
        due_date: initiative.due_date,
      });

      results.push({
        id: initiative.id,
        action_type: initiative.action_type,
        executor: initiative.executor_name,
        success: result.success,
        changes: result.changes_made.length,
        errors: result.errors.length,
        ms: Date.now() - t0,
      });

      // Уведомление о каждом результате
      const icon = result.success ? '✅' : '❌';
      await notifyOwner(
        `${icon} <b>${initiative.action_type}</b>\n` +
        `Исполнитель: ${initiative.executor_name}\n` +
        `Изменений: ${result.changes_made.length}, Ошибок: ${result.errors.length}\n` +
        (result.changes_made[0] ? `• ${result.changes_made[0]}` : '')
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        id: initiative.id,
        action_type: initiative.action_type,
        executor: initiative.executor_name ?? initiative.executor_agent_id,
        success: false,
        changes: 0,
        errors: 1,
        ms: Date.now() - t0,
        error: msg,
      });
      await notifyOwner(
        `❌ <b>ОШИБКА</b> ${initiative.action_type}\n${msg.slice(0, 300)}`
      );
    }
  }

  const successCount = results.filter(r => r.success).length;

  // Сводка в Telegram
  await notifyOwner(
    `<b>Batch executor завершён</b>\n` +
    `Всего: ${results.length} | Успешно: ${successCount} | Ошибок: ${results.length - successCount}\n` +
    results.map(r => `${r.success ? '✅' : '❌'} ${r.action_type} [${r.executor}]`).join('\n')
  );

  return NextResponse.json({
    success: true,
    total: results.length,
    succeeded: successCount,
    failed: results.length - successCount,
    hours_window: hours,
    log,
    results,
  });
}
