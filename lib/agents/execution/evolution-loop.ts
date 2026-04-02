/**
 * Autonomous Evolution Loop
 *
 * Запускается из Codespace, делает:
 * 1. Триггер совещания через CRON_SECRET
 * 2. Ждёт результаты в БД
 * 3. Парсит инициативы
 * 4. Исполняет их (git commits + pushes)
 * 5. Логирует всё в agent memory
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

const PROD_URL = 'https://tourhab.ru';
const CRON_SECRET = process.env.CRON_SECRET || '';

interface BoardMeetingResult {
  meeting_id: string;
  agents_ok: number;
  reactions_count: number;
  observers_count: number;
  duration_ms: number;
}

interface AgentInitiative {
  id?: string;
  from_id: string;
  from_name: string;
  action_type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  executor_id: string;
  executor_name: string;
}

function logEvent(event: string, data?: Record<string, unknown>) {
  const msg = { timestamp: new Date().toISOString(), event, ...data };
  // Write to journal for later analysis
  const entry = JSON.stringify(msg);
  process.stdout.write(`[EVOLUTION] ${entry}\n`);
}

export async function triggerBoardMeeting(): Promise<boolean> {
  logEvent('board_meeting_trigger_start');
  try {
    const res = await fetch(`${PROD_URL}/api/cron/board-meeting?secret=${CRON_SECRET}`, {
      method: 'GET',
    });
    const data = await res.json() as { success?: boolean };
    if (data.success) {
      logEvent('board_meeting_triggered');
      return true;
    }
    logEvent('board_meeting_trigger_failed');
    return false;
  } catch (e) {
    logEvent('board_meeting_trigger_error', { error: String(e) });
    return false;
  }
}

export async function waitForBoardMeetingCompletion(
  maxWaitMs: number = 300_000
): Promise<BoardMeetingResult | null> {
  logEvent('waiting_for_board_meeting');
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const result = await pool.query<BoardMeetingResult>(
        `SELECT
           (metadata->>'intent') as intent,
           (metadata->>'decision') as meeting_id,
           (metadata->>'agents_ok')::int as agents_ok,
           (metadata->>'reactions_count')::int as reactions_count,
           (metadata->>'observers_count')::int as observers_count,
           (metadata->>'duration_ms')::int as duration_ms
         FROM ai_actions_log
         WHERE action_type = 'agent_board-meeting'
         AND (metadata->>'intent') = 'board_meeting'
         AND created_at > NOW() - INTERVAL '10 minutes'
         ORDER BY created_at DESC
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        logEvent('board_meeting_completed', row as unknown as Record<string, unknown>);
        return row;
      }
    } catch (e) {
      // Table might not exist yet
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  logEvent('board_meeting_timeout');
  return null;
}

export async function fetchInitiatives(): Promise<AgentInitiative[]> {
  logEvent('fetching_initiatives');
  try {
    const result = await pool.query<AgentInitiative>(
      `SELECT
         id,
         context->>'from_agent' as from_id,
         COALESCE(context->>'from_name', 'Unknown') as from_name,
         type as action_type,
         description as title,
         context->>'full_description' as description,
         COALESCE(context->>'priority', 'medium') as priority,
         executor_agent_id as executor_id,
         COALESCE(executor_name, 'Pending') as executor_name
       FROM agent_approvals
       WHERE created_at > NOW() - INTERVAL '1 hour'
       AND execution_status = 'assigned'
       ORDER BY created_at DESC`
    );

    logEvent('initiatives_fetched', { count: result.rows.length });
    return result.rows;
  } catch (e) {
    logEvent('initiatives_fetch_error', { error: String(e) });
    return [];
  }
}

export async function analyzeInitiative(init: AgentInitiative): Promise<string | null> {
  logEvent('analyzing_initiative', { title: init.title, from: init.from_name });

  const prompt = `You are VibeCoder, the development director of TourHab platform.

Initiative from ${init.from_name}:
- Type: ${init.action_type}
- Title: ${init.title}
- Description: ${init.description}
- Priority: ${init.priority}
- Executor: ${init.executor_name}

Analyze this initiative and determine:
1. Is it safe to execute immediately? (yes/no)
2. What are the risks?
3. What code changes are needed (file paths + brief changes)?
4. Can you execute it autonomously or does it need director approval?

Respond in JSON format ONLY, no other text.`;

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const response = await callAIWaterfall(messages);

  if (response.startsWith('Извините')) {
    logEvent('initiative_analysis_failed', { title: init.title });
    return null;
  }

  logEvent('initiative_analyzed', { title: init.title });
  return response;
}

export async function executeInitiative(
  init: AgentInitiative,
  analysis: string
): Promise<boolean> {
  logEvent('executing_initiative', { title: init.title, type: init.action_type });

  // Parse AI analysis
  let parsed;
  try {
    const match = analysis.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    parsed = JSON.parse(match[0]);
  } catch (e) {
    logEvent('initiative_parse_error', { title: init.title, error: String(e) });
    return false;
  }

  // Check safety
  if (parsed.safe_to_execute !== 'yes') {
    logEvent('initiative_requires_approval', { title: init.title });
    return false;
  }

  // Import executor dynamically to avoid circular deps
  const { executeInitiativeWithCode } = await import('@/lib/agents/execution/vibe-coder-executor');

  // Execute based on action_type
  const result = await executeInitiativeWithCode(analysis, {
    title: init.title,
    from_name: init.from_name,
    action_type: init.action_type,
    approval_id: init.id || 'unknown',
  });

  if (result.success) {
    logEvent('initiative_executed', {
      title: init.title,
      commit: result.commit_hash,
      pr: result.pr_url,
      files: result.files_changed,
    });
  } else {
    logEvent('initiative_execution_failed', {
      title: init.title,
      error: result.error,
    });
  }

  return result.success;
}

export async function startEvolutionLoop() {
  logEvent('evolution_loop_started');

  // Step 1: Trigger
  const triggered = await triggerBoardMeeting();
  if (!triggered) return;

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 2: Wait for completion
  const result = await waitForBoardMeetingCompletion();
  if (!result) return;

  // Step 3: Fetch initiatives
  const initiatives = await fetchInitiatives();
  if (initiatives.length === 0) {
    logEvent('no_initiatives_to_execute');
    return;
  }

  // Step 4: Process each initiative
  for (const init of initiatives) {
    const analysis = await analyzeInitiative(init);
    if (analysis) {
      await executeInitiative(init, analysis);
    }
  }

  logEvent('evolution_loop_completed');
}

// Run if called directly
if (require.main === module) {
  startEvolutionLoop().catch(err => {
    logEvent('evolution_loop_error', { error: String(err) });
  });
}

export { startEvolutionLoop as default };
