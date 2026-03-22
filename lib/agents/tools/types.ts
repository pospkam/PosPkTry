/**
 * lib/agents/tools/types.ts
 * Type definitions for the Agent Autonomy System.
 *
 * Each agent has a set of tools it can execute autonomously.
 * Tools have permission levels (auto / approval) and optional measurement.
 */

// ── Tool Definition ─────────────────────────────────────────────────────────

export interface AgentToolDef {
  name: string;
  description: string;
  permission: 'auto' | 'approval';
  cooldown_ms: number;
  execute: (input: ToolInput) => Promise<ToolOutput>;
  measure?: (actionId: string, input: ToolInput, output: ToolOutput) => Promise<Measurement>;
}

// ── Input / Output ──────────────────────────────────────────────────────────

export interface ToolInput {
  agent_id: string;
  params: Record<string, unknown>;
}

export interface ToolOutput {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  metrics_before?: Record<string, number>;
}

// ── Measurement (feedback loop) ─────────────────────────────────────────────

export interface Measurement {
  metrics_after: Record<string, number>;
  delta: Record<string, number>;
  verdict: 'positive' | 'negative' | 'neutral';
}

// ── Action Record (DB row) ──────────────────────────────────────────────────

export interface AgentAction {
  id: string;
  agent_id: string;
  tool_name: string;
  permission: 'auto' | 'approval';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: 'pending' | 'running' | 'done' | 'failed' | 'blocked';
  error_message: string | null;
  approval_id: string | null;
  measured_at: string | null;
  measurement: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

// ── Tool Registry Entry (DB row) ────────────────────────────────────────────

export interface AgentToolRow {
  id: string;
  agent_id: string;
  tool_name: string;
  description: string;
  permission: 'auto' | 'approval';
  cooldown_ms: number;
  enabled: boolean;
  created_at: string;
}
