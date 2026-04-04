/**
 * app/api/cron/initiatives-execute/route.ts
 *
 * EXECUTOR CRON JOB
 * Запускается каждый час
 *
 * Проверяет:
 * 1. Есть ли одобренные инициативы (status = 'approved')
 * 2. С назначенным исполнителем (executor_agent_id != NULL)
 * 3. С execution_status = 'assigned'
 * → Запускает фактическое выполнение
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { executeInitiative } from '@/lib/agents/execution/initiative-executor';
import { agentMemory } from '@/lib/agents/memory/agent-memory';

export const dynamic = 'force-dynamic';

// Отправляет алерта в приватный чат owner
async function notifyOwner(message: string): Promise<void> {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  const ownerId = process.env.TELEGRAM_OWNER_ID;

  if (!token || !ownerId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ownerId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch {
    // Silent fail - не блокируем выполнение если Telegram недоступен
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];

  try {
    // ─── PHASE 1: Find approved + assigned initiatives ─────────────────────

    const pendingInitiatives = await pool.query(
      `SELECT
        id,
        action_type,
        description,
        context,
        executor_agent_id,
        executor_name,
        due_date
      FROM agent_approvals
      WHERE status = 'approved'
        AND execution_status = 'assigned'
        AND executor_agent_id IS NOT NULL
        AND (due_date IS NULL OR due_date <= NOW() OR due_date = CURRENT_DATE)
      ORDER BY created_at ASC
      LIMIT 5`  // Process max 5 per hour
    );

    results.push({
      phase: 'discovery',
      found: pendingInitiatives.rowCount,
      message: `Found ${pendingInitiatives.rowCount} approved initiatives ready for execution`,
    });

    if (pendingInitiatives.rowCount === 0) {
      return NextResponse.json({
        success: true,
        results,
        message: 'No initiatives ready for execution',
      });
    }

    // ─── PHASE 2: Execute each initiative ────────────────────────────────

    const executionResults = [];

    for (const initiative of pendingInitiatives.rows) {
      const startTime = Date.now();
      const ctx = (initiative.context ?? {}) as { from_agent?: string; meeting_id?: string };

      try {
        const result = await executeInitiative({
          approval_id: initiative.id,
          executor_agent_id: initiative.executor_agent_id,
          action_type: initiative.action_type,
          description: initiative.description,
          context: initiative.context || {},
          due_date: initiative.due_date,
        });

        const executionTime = Date.now() - startTime;

        executionResults.push({
          initiative_id: initiative.id,
          executor: initiative.executor_name,
          action_type: initiative.action_type,
          success: result.success,
          changes: result.changes_made.length,
          errors: result.errors.length,
          time_ms: executionTime,
          verification: result.verification_passed,
        });

        // ─── PHASE 3: Notification ───────────────────────────────────────

        const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
        const message = [
          `${status} | Initiative executed`,
          `Executor: ${initiative.executor_name}`,
          `Action: ${initiative.action_type}`,
          `Changes: ${result.changes_made.length}`,
          `Errors: ${result.errors.length}`,
          `Time: ${executionTime}ms`,
          '',
          'Changes made:',
          ...result.changes_made.slice(0, 5).map(c => `  • ${c}`),
          result.changes_made.length > 5 ? `  ... and ${result.changes_made.length - 5} more` : '',
        ]
          .filter(s => s.length > 0)
          .join('\n');

        // Telegram notification
        await notifyOwner(message);

        // Log to database
        await pool.query(
          `INSERT INTO ai_actions_log (action_type, metadata)
           VALUES ('initiative_executed', $1)`,
          [
            JSON.stringify({
              initiative_id: initiative.id,
              executor_agent_id: initiative.executor_agent_id,
              action_type: initiative.action_type,
              success: result.success,
              changes_count: result.changes_made.length,
              errors_count: result.errors.length,
              execution_time_ms: executionTime,
              verification_passed: result.verification_passed,
              rollback_available: result.rollback_available,
            }),
          ]
        );

        // Learning loop: write execution outcome back to proposal initiator memory.
        if (ctx.from_agent) {
          await agentMemory.remember({
            agent_id: ctx.from_agent,
            memory_type: 'insight',
            key: `initiative_exec_${initiative.id}`,
            value: {
              approval_id: initiative.id,
              meeting_id: ctx.meeting_id ?? null,
              action_type: initiative.action_type,
              result: result.success ? 'done' : 'failed',
              changes_count: result.changes_made.length,
              errors_count: result.errors.length,
              verification_passed: result.verification_passed,
              date: new Date().toISOString().slice(0, 10),
            },
            source: 'initiatives_execute_cron',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }).catch(() => null);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        executionResults.push({
          initiative_id: initiative.id,
          executor: initiative.executor_name,
          action_type: initiative.action_type,
          success: false,
          error: errorMsg,
          time_ms: Date.now() - startTime,
        });

        // Telegram alert
        await notifyOwner(
          `<b>ERROR executing initiative</b>\n<b>Executor:</b> ${initiative.executor_name}\n<b>Error:</b> ${errorMsg}`
        );

        if (ctx.from_agent) {
          await agentMemory.remember({
            agent_id: ctx.from_agent,
            memory_type: 'insight',
            key: `initiative_exec_${initiative.id}`,
            value: {
              approval_id: initiative.id,
              meeting_id: ctx.meeting_id ?? null,
              action_type: initiative.action_type,
              result: 'failed',
              error: errorMsg.substring(0, 500),
              date: new Date().toISOString().slice(0, 10),
            },
            source: 'initiatives_execute_cron',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }).catch(() => null);
        }
      }
    }

    results.push({
      phase: 'execution',
      count: executionResults.length,
      results: executionResults,
    });

    // ─── PHASE 4: Summary report ─────────────────────────────────────────

    const successCount = executionResults.filter((r: any) => r.success).length;
    const failureCount = executionResults.filter((r: any) => !r.success).length;

    results.push({
      phase: 'summary',
      total_executed: executionResults.length,
      success: successCount,
      failed: failureCount,
      total_time_ms: executionResults.reduce((sum: number, r: any) => sum + r.time_ms, 0),
    });

    return NextResponse.json({
      success: true,
      cron_job: 'initiatives-execute',
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    await notifyOwner(
      `<b>CRON ERROR: initiatives-execute</b>\n${errorMsg}`
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        results,
      },
      { status: 500 }
    );
  }
}
