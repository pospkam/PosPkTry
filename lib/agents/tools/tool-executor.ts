/**
 * lib/agents/tools/tool-executor.ts
 * Central executor for all autonomous agent tools.
 *
 * Flow:
 * 1. Resolve tool from registry
 * 2. Check permission (auto → execute, approval → request approval)
 * 3. Check cooldown
 * 4. Create agent_actions record (status='running')
 * 5. Execute tool
 * 6. Update record (status='done'/'failed')
 * 7. Log to ai_actions_log
 * 8. Save to agent_memory
 */

import { pool } from '@/lib/db-pool';
import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { approvalRequired } from '@/lib/agents/safeguards/approval-required';
import { auditLog } from '@/lib/agents/safeguards/audit-log';
import type { AgentToolDef, ToolInput, ToolOutput, AgentAction, Measurement } from './types';

// ── Global Tool Registry ────────────────────────────────────────────────────

const TOOL_REGISTRY: Map<string, AgentToolDef[]> = new Map();

/**
 * Register tools for an agent.
 * Called at import time by each agent's tools module.
 */
export function registerTools(agentId: string, tools: AgentToolDef[]): void {
  TOOL_REGISTRY.set(agentId, tools);
}

/**
 * Get all registered tools for an agent.
 */
export function getTools(agentId: string): AgentToolDef[] {
  return TOOL_REGISTRY.get(agentId) ?? [];
}

/**
 * Get full registry (all agents).
 */
export function getAllTools(): Record<string, AgentToolDef[]> {
  const result: Record<string, AgentToolDef[]> = {};
  for (const [agentId, tools] of TOOL_REGISTRY) {
    result[agentId] = tools;
  }
  return result;
}

// ── Tool Executor ───────────────────────────────────────────────────────────

/**
 * Execute a tool for an agent with full lifecycle management.
 */
export async function executeTool(
  agentId: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<{ actionId: string; result: ToolOutput }> {
  // 1. Find tool in registry
  const tools = TOOL_REGISTRY.get(agentId);
  const tool = tools?.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found for agent '${agentId}'`);
  }

  const input: ToolInput = { agent_id: agentId, params };

  // 2. Check cooldown
  if (tool.cooldown_ms > 0) {
    const tooSoon = await checkCooldown(agentId, toolName, tool.cooldown_ms);
    if (tooSoon) {
      return {
        actionId: '',
        result: {
          success: false,
          message: `Cooldown active: ${toolName} was called recently (${tool.cooldown_ms}ms interval)`,
        },
      };
    }
  }

  // 3. Check permission
  if (tool.permission === 'approval') {
    const approval = await approvalRequired.request({
      type: toolName,
      description: `Agent ${agentId}: ${tool.description}`,
      context: { agent_id: agentId, tool_name: toolName, params },
      requested_by: `agent:${agentId}`,
    });

    if (approval.needs_approval) {
      // Create blocked action record
      const actionId = await createAction(agentId, toolName, 'approval', input, 'blocked', approval.id);
      return {
        actionId,
        result: {
          success: false,
          message: approval.reason ?? `Requires approval (id: ${approval.id})`,
        },
      };
    }
  }

  // 4. Create action record
  const actionId = await createAction(agentId, toolName, tool.permission, input, 'running');

  // 5. Execute
  let result: ToolOutput;
  try {
    result = await tool.execute(input);

    // 6a. Success
    await updateAction(actionId, 'done', result);

    await auditLog.write({
      event_type: 'agent_dispatch',
      actor: `agent:${agentId}`,
      resource: toolName,
      details: {
        action_id: actionId,
        success: result.success,
        message: result.message,
      },
    });

    // 7. Save to memory
    await agentMemory.remember({
      agent_id: agentId,
      memory_type: 'action',
      key: `${toolName}_${Date.now()}`,
      value: {
        action_id: actionId,
        tool: toolName,
        params,
        success: result.success,
        message: result.message,
        metrics_before: result.metrics_before,
        timestamp: new Date().toISOString(),
      },
      source: 'autonomous_work',
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days TTL
    });

    return { actionId, result };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result = { success: false, message: errorMsg };

    // 6b. Failure
    await updateAction(actionId, 'failed', result, errorMsg);

    return { actionId, result };
  }
}

// ── Measurement System (Feedback Loop) ──────────────────────────────────────

/**
 * Measure past actions that haven't been measured yet.
 * Called by scheduler once per day.
 * Looks for actions completed 7+ days ago without measurement.
 */
export async function measurePastActions(minAgeDays = 7): Promise<number> {
  const { rows } = await pool.query<AgentAction>(`
    SELECT id, agent_id, tool_name,
           input, output, created_at, completed_at
    FROM agent_actions
    WHERE status = 'done'
      AND measured_at IS NULL
      AND completed_at < NOW() - ($1 || ' days')::interval
    ORDER BY completed_at ASC
    LIMIT 20
  `, [minAgeDays]);

  let measured = 0;

  for (const action of rows) {
    const tools = TOOL_REGISTRY.get(action.agent_id);
    const tool = tools?.find(t => t.name === action.tool_name);

    if (!tool?.measure) {
      // No measure function — mark as measured with neutral verdict
      await pool.query(
        `UPDATE agent_actions SET measured_at = NOW(), measurement = $2 WHERE id = $1`,
        [action.id, JSON.stringify({ verdict: 'no_measure_fn', metrics_after: {}, delta: {} })]
      );
      continue;
    }

    try {
      const measurement = await tool.measure(
        action.id,
        { agent_id: action.agent_id, params: action.input as Record<string, unknown> },
        action.output as unknown as ToolOutput
      );

      await pool.query(
        `UPDATE agent_actions SET measured_at = NOW(), measurement = $2 WHERE id = $1`,
        [action.id, JSON.stringify(measurement)]
      );

      // Update agent confidence based on verdict
      await updateConfidence(action.agent_id, action.tool_name, measurement);

      measured++;
    } catch {
      // Measurement failed — skip, try again next day
    }
  }

  return measured;
}

// ── History ─────────────────────────────────────────────────────────────────

/**
 * Get action history for an agent.
 */
export async function getActionHistory(
  agentId: string,
  limit = 20
): Promise<AgentAction[]> {
  const { rows } = await pool.query<AgentAction>(`
    SELECT id, agent_id, tool_name, permission,
           input, output, status, error_message,
           approval_id::text, measured_at::text,
           measurement, created_at::text, completed_at::text
    FROM agent_actions
    WHERE agent_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [agentId, limit]);
  return rows;
}

/**
 * Get agent's autonomous work summary for board meetings.
 */
export async function getAutonomySummary(agentId: string, days = 7): Promise<{
  total_actions: number;
  successful: number;
  failed: number;
  measured: number;
  positive_outcomes: number;
  negative_outcomes: number;
  top_tools: Array<{ tool_name: string; count: number; success_rate: number }>;
}> {
  const { rows: stats } = await pool.query<{
    total: string;
    successful: string;
    failed: string;
    measured: string;
    positive: string;
    negative: string;
  }>(`
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE status = 'done')::text AS successful,
      COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
      COUNT(*) FILTER (WHERE measured_at IS NOT NULL)::text AS measured,
      COUNT(*) FILTER (WHERE measurement->>'verdict' = 'positive')::text AS positive,
      COUNT(*) FILTER (WHERE measurement->>'verdict' = 'negative')::text AS negative
    FROM agent_actions
    WHERE agent_id = $1
      AND created_at >= NOW() - ($2 || ' days')::interval
  `, [agentId, days]);

  const { rows: toolStats } = await pool.query<{
    tool_name: string;
    cnt: string;
    success_cnt: string;
  }>(`
    SELECT tool_name,
           COUNT(*)::text AS cnt,
           COUNT(*) FILTER (WHERE status = 'done')::text AS success_cnt
    FROM agent_actions
    WHERE agent_id = $1
      AND created_at >= NOW() - ($2 || ' days')::interval
    GROUP BY tool_name
    ORDER BY COUNT(*) DESC
    LIMIT 5
  `, [agentId, days]);

  const s = stats[0];
  return {
    total_actions: parseInt(s?.total ?? '0', 10),
    successful: parseInt(s?.successful ?? '0', 10),
    failed: parseInt(s?.failed ?? '0', 10),
    measured: parseInt(s?.measured ?? '0', 10),
    positive_outcomes: parseInt(s?.positive ?? '0', 10),
    negative_outcomes: parseInt(s?.negative ?? '0', 10),
    top_tools: toolStats.map(t => ({
      tool_name: t.tool_name,
      count: parseInt(t.cnt, 10),
      success_rate: parseInt(t.cnt, 10) > 0
        ? parseInt(t.success_cnt, 10) / parseInt(t.cnt, 10)
        : 0,
    })),
  };
}

// ── Internal helpers ────────────────────────────────────────────────────────

async function createAction(
  agentId: string,
  toolName: string,
  permission: string,
  input: ToolInput,
  status: string,
  approvalId?: string
): Promise<string> {
  try {
    const { rows } = await pool.query<{ id: string }>(`
      INSERT INTO agent_actions (agent_id, tool_name, permission, input, status, approval_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [agentId, toolName, permission, JSON.stringify(input.params), status, approvalId ?? null]);
    return rows[0].id;
  } catch {
    return '';
  }
}

async function updateAction(
  actionId: string,
  status: string,
  output: ToolOutput,
  errorMessage?: string
): Promise<void> {
  if (!actionId) return;
  try {
    await pool.query(`
      UPDATE agent_actions
      SET status = $2, output = $3, error_message = $4,
          completed_at = CASE WHEN $2 IN ('done', 'failed') THEN NOW() ELSE completed_at END
      WHERE id = $1
    `, [actionId, status, JSON.stringify(output), errorMessage ?? null]);
  } catch {
    // non-critical
  }
}

async function checkCooldown(
  agentId: string,
  toolName: string,
  cooldownMs: number
): Promise<boolean> {
  try {
    const { rows } = await pool.query<{ last_run: string }>(`
      SELECT completed_at::text AS last_run
      FROM agent_actions
      WHERE agent_id = $1 AND tool_name = $2 AND status = 'done'
      ORDER BY completed_at DESC
      LIMIT 1
    `, [agentId, toolName]);

    if (rows.length === 0) return false;

    const lastRun = new Date(rows[0].last_run).getTime();
    return Date.now() - lastRun < cooldownMs;
  } catch {
    return false;
  }
}

async function updateConfidence(
  agentId: string,
  toolName: string,
  measurement: Measurement
): Promise<void> {
  const existing = await agentMemory.get(agentId, 'confidence', toolName);
  const currentConfidence = existing
    ? (existing.value as { score?: number }).score ?? 0.5
    : 0.5;

  // Adjust confidence: +0.05 for positive, -0.1 for negative, 0 for neutral
  let delta = 0;
  if (measurement.verdict === 'positive') delta = 0.05;
  if (measurement.verdict === 'negative') delta = -0.1;

  const newConfidence = Math.max(0, Math.min(1, currentConfidence + delta));

  await agentMemory.remember({
    agent_id: agentId,
    memory_type: 'confidence',
    key: toolName,
    value: {
      score: newConfidence,
      last_verdict: measurement.verdict,
      total_measurements: ((existing?.value as { total_measurements?: number })?.total_measurements ?? 0) + 1,
      last_measured: new Date().toISOString(),
    },
    confidence: newConfidence,
    source: 'measurement',
  });
}
