/**
 * POST /api/cron/evolution-loop
 *
 * Autonomous evolution cycle:
 * 1. Trigger board meeting via CRON_SECRET
 * 2. Wait for results in ai_actions_log + agent_approvals
 * 3. Fetch initiatives (agent_approvals with execution_status = 'assigned')
 * 4. Analyze and execute them
 * 5. Log everything
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function verifySecret(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  const xSecret = req.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return false;

  const provided = authHeader?.replace('Bearer ', '').trim() ?? xSecret ?? '';
  return provided === cronSecret;
}

async function fetchInitiatives() {
  try {
    const result = await pool.query(
      `SELECT
         id,
         context->>'from_agent' as from_agent,
         context->>'from_name' as from_name,
         type as action_type,
         description as title,
         context->>'full_description' as description,
         context->>'priority' as priority,
         executor_agent_id as executor_id,
         executor_name,
         needs_approval
       FROM agent_approvals
       WHERE created_at > NOW() - INTERVAL '2 hours'
       AND execution_status = 'assigned'
       AND approval_status = 'pending'
       ORDER BY created_at DESC
       LIMIT 10`
    );
    return result.rows;
  } catch (e) {
    console.error('Failed to fetch initiatives:', e);
    return [];
  }
}

async function analyzeInitiative(init: Record<string, unknown>): Promise<{ safe: boolean; analysis: string }> {
  const prompt = `You are VibeCoder, the development director of TourHab platform.

Initiative:
- Type: ${init.action_type}
- Title: ${init.title}
- Description: ${init.description}
- Priority: ${init.priority}
- From: ${init.from_name}

Analyze and respond with JSON ONLY:
{"safe_to_execute": "yes" | "no", "reason": "explanation", "risks": ["risk1", "risk2"]}`;

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const response = await callAIWaterfall(messages);

  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        safe: parsed.safe_to_execute === 'yes',
        analysis: JSON.stringify(parsed),
      };
    }
  } catch {
    // continue
  }

  return { safe: false, analysis: response };
}

async function logEvent(action_type: string, metadata: Record<string, unknown>) {
  try {
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
      [action_type, JSON.stringify(metadata)]
    );
  } catch (e) {
    console.error('Failed to log event:', e);
  }
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifySecret(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const events: Array<{ stage: string; data: Record<string, unknown> }> = [];

  try {
    // Stage 1: Fetch initiatives
    events.push({ stage: 'start', data: { timestamp: new Date().toISOString() } });

    const initiatives = await fetchInitiatives();
    events.push({ stage: 'initiatives_fetched', data: { count: initiatives.length } });

    if (initiatives.length === 0) {
      await logEvent('evolution_loop', {
        status: 'no_initiatives',
        duration_ms: Date.now() - startTime,
        events,
      });

      return NextResponse.json({
        success: true,
        message: 'No initiatives to execute',
        events,
      });
    }

    // Stage 2: Process each initiative
    const results = [];
    for (const init of initiatives) {
      try {
        const analysis = await analyzeInitiative(init);
        results.push({
          title: init.title,
          safe: analysis.safe,
          analysis: analysis.analysis,
        });

        // Update approval status
        if (analysis.safe) {
          await pool.query(
            `UPDATE agent_approvals SET approval_status = 'approved', execution_status = 'in_progress' WHERE id = $1`,
            [init.id]
          );
        } else {
          await pool.query(
            `UPDATE agent_approvals SET execution_status = 'hold_for_review' WHERE id = $1`,
            [init.id]
          );
        }

        events.push({ stage: 'initiative_analyzed', data: { title: init.title, safe: analysis.safe } });
      } catch (e) {
        events.push({ stage: 'initiative_error', data: { title: init.title, error: String(e) } });
      }
    }

    // Stage 3: Log completion
    const duration = Date.now() - startTime;
    await logEvent('evolution_loop', {
      status: 'success',
      duration_ms: duration,
      initiatives_processed: initiatives.length,
      results,
      events,
    });

    return NextResponse.json({
      success: true,
      initiatives_processed: initiatives.length,
      results,
      duration_ms: duration,
      events,
    });
  } catch (e) {
    const duration = Date.now() - startTime;
    await logEvent('evolution_loop', {
      status: 'error',
      error: String(e),
      duration_ms: duration,
      events,
    });

    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : String(e),
        duration_ms: duration,
        events,
      },
      { status: 500 }
    );
  }
}
