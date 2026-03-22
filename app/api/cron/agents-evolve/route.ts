/**
 * GET /api/cron/agents-evolve
 * Autonomous agent evolution cycle -- runs every 6 hours.
 *
 * Phases:
 *   A. Observe -- detect patterns + feedback
 *   B. Learn  -- store insights as agent_memory
 *   C. Evolve -- conclude mature experiments, create new ones
 *   D. Maintain -- cleanup expired memories
 *   E. Report -- log + telegram notification
 *
 * URL: https://tourhab.ru/api/cron/agents-evolve?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { PatternRecognition } from '@/lib/agents/learning/pattern-recognition';
import { FeedbackLoop } from '@/lib/agents/learning/feedback-loop';
import { ExperimentTracker } from '@/lib/agents/learning/experiment-tracker';
import { agentMemory } from '@/lib/agents/memory/agent-memory';

export const dynamic = 'force-dynamic';

async function tgAlert(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 500 }
    );
  }

  const provided = authHeader?.replace('Bearer ', '').trim() ?? secret ?? '';
  if (provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  const report: string[] = ['<b>AI Evolution Cycle</b>', ''];
  let patternsFound = 0;
  let memoriesStored = 0;
  let experimentsUpdated = 0;
  let memoriesCleaned = 0;

  try {
    const patterns = new PatternRecognition();
    const feedback = new FeedbackLoop();
    const experiments = new ExperimentTracker();

    // ── Phase A: Observe ──────────────────────────────────────────────────────
    const [systemPatterns, feedbackSummary] = await Promise.all([
      patterns.detectPatterns(24),
      feedback.getSummary(24),
    ]);

    patternsFound = systemPatterns.length;
    const critical = systemPatterns.filter(p => p.severity === 'critical');
    const warnings = systemPatterns.filter(p => p.severity === 'warning');

    report.push(
      `Observe: ${patternsFound} паттернов (${critical.length} крит., ${warnings.length} предупр.)`,
      `Удовлетворённость: ${Math.round((feedbackSummary.overall_satisfaction ?? 0) * 100)}%`,
    );

    // ── Phase B: Learn ────────────────────────────────────────────────────────
    for (const p of critical) {
      await agentMemory.remember({
        agent_id: 'evo',
        memory_type: 'pattern',
        key: `critical_${p.intent}`,
        value: {
          pattern_type: p.pattern_type,
          description: p.description,
          recommendation: p.recommendation,
          severity: p.severity,
        },
        confidence: 0.9,
        source: 'evolution_cron',
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      });
      memoriesStored++;
    }

    if (feedbackSummary.worst_intent) {
      await agentMemory.remember({
        agent_id: 'evo',
        memory_type: 'insight',
        key: `worst_intent_${new Date().toISOString().slice(0, 10)}`,
        value: {
          worst_intent: feedbackSummary.worst_intent,
          satisfaction: feedbackSummary.overall_satisfaction,
          total_feedback: feedbackSummary.total_feedback,
        },
        confidence: 0.8,
        source: 'evolution_cron',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      memoriesStored++;
    }

    report.push(`Learn: ${memoriesStored} воспоминаний сохранено`);

    // ── Phase C: Evolve ───────────────────────────────────────────────────────
    const running = await experiments.list('running');

    for (const exp of running) {
      const results = await experiments.calculateResults(exp.id);
      if (results.total >= 50 && results.winner) {
        await experiments.updateStatus(exp.id, 'completed', results.winner);
        await agentMemory.remember({
          agent_id: 'evo',
          memory_type: 'insight',
          key: `experiment_result_${exp.id}`,
          value: {
            experiment_name: exp.name,
            intent: exp.intent,
            winner: results.winner,
            rate_a: results.variant_a.rate,
            rate_b: results.variant_b.rate,
            total: results.total,
          },
          source: 'experiment',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        experimentsUpdated++;
        report.push(`Experiment "${exp.name}" completed: winner=${results.winner}`);
      }
    }

    // Create new experiment if none running and we have enough data
    if (running.length === 0) {
      try {
        const topIntentsResult = await pool.query<{ decision: string; cnt: string }>(`
          SELECT metadata->>'decision' AS decision, COUNT(*)::text AS cnt
          FROM ai_actions_log
          WHERE action_type LIKE 'agent_%'
            AND action_type NOT IN ('agent_feedback', 'agent_experiment_result')
            AND created_at >= NOW() - INTERVAL '7 days'
            AND metadata->>'decision' IS NOT NULL
            AND metadata->>'decision' != 'unknown'
          GROUP BY metadata->>'decision'
          ORDER BY cnt::int DESC
          LIMIT 1
        `);

        if (topIntentsResult.rows.length > 0) {
          const top = topIntentsResult.rows[0];
          const exp = await experiments.create({
            name: `auto_evolve_${top.decision}_${Date.now()}`,
            description: `Auto-created by evolution cron (${top.cnt} calls/week)`,
            intent: top.decision,
            variant_a: { label: 'control', prompt_style: 'current' },
            variant_b: { label: 'optimized', prompt_style: 'concise_structured' },
          });
          experimentsUpdated++;
          report.push(`New experiment created: ${exp.name}`);
        }
      } catch { /* non-critical */ }
    }

    report.push(`Evolve: ${experimentsUpdated} экспериментов обновлено`);

    // ── Phase D: Maintain ─────────────────────────────────────────────────────
    memoriesCleaned = await agentMemory.cleanup();
    const totalMemories = await agentMemory.count();
    report.push(`Maintain: ${memoriesCleaned} просроченных удалено, ${totalMemories} активных`);

    // ── Phase E: Report ───────────────────────────────────────────────────────
    const duration = Date.now() - start;
    report.push('', `Выполнено за ${duration}ms`);

    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
      [
        'agent_evolution_cycle',
        JSON.stringify({
          decision: 'evolution_cycle',
          result: 'success',
          duration_ms: duration,
          patterns_found: patternsFound,
          memories_stored: memoriesStored,
          experiments_updated: experimentsUpdated,
          memories_cleaned: memoriesCleaned,
        }),
      ]
    );

    // Telegram notification (only if something notable happened)
    if (critical.length > 0 || experimentsUpdated > 0) {
      await tgAlert(report.join('\n'));
    }

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      patterns_found: patternsFound,
      memories_stored: memoriesStored,
      experiments_updated: experimentsUpdated,
      memories_cleaned: memoriesCleaned,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
