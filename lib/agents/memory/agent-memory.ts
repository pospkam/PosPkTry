/**
 * AgentMemory — persistent cross-run knowledge store for AI agents.
 *
 * 3-tier architecture (Letta pattern):
 *   Tier 1 (core)     — key insights, always injected into system prompt
 *   Tier 2 (archival) — searchable by tags, semantic relevance
 *   Tier 3 (recall)   — recent conversation/decision history
 *
 * Features: TTL, cross-agent sharing, diff tracking, tag filtering.
 * Table: agent_memory (migration 064 + 0647)
 */

import { pool } from '@/lib/db-pool';

export type MemoryTier = 1 | 2 | 3;

export interface MemoryEntry {
  id: string;
  agent_id: string;
  memory_type: string;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  source: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  memory_tier?: MemoryTier;
  tags?: string[];
  edit_count?: number;
}

interface RememberParams {
  agent_id: string;
  memory_type: string;
  key: string;
  value: Record<string, unknown>;
  confidence?: number;
  source?: string;
  expires_at?: Date;
  memory_tier?: MemoryTier;
  tags?: string[];
  meeting_id?: string;
}

export class AgentMemory {
  /**
   * Upsert a memory entry with tier, tags, and diff tracking.
   * If the same (agent_id, memory_type, key) exists, logs the diff.
   */
  async remember(params: RememberParams): Promise<void> {
    try {
      // Check if entry exists (for diff tracking)
      const { rows: existing } = await pool.query<{ id: string; value: Record<string, unknown> }>(
        `SELECT id, value FROM agent_memory
         WHERE agent_id = $1 AND memory_type = $2 AND key = $3`,
        [params.agent_id, params.memory_type, params.key]
      );

      const result = await pool.query<{ id: string }>(
        `INSERT INTO agent_memory (agent_id, memory_type, key, value, confidence, source, expires_at, memory_tier, tags, source_meeting_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (agent_id, memory_type, key) DO UPDATE SET
           value = EXCLUDED.value,
           confidence = EXCLUDED.confidence,
           source = EXCLUDED.source,
           expires_at = EXCLUDED.expires_at,
           memory_tier = COALESCE(EXCLUDED.memory_tier, agent_memory.memory_tier),
           tags = COALESCE(EXCLUDED.tags, agent_memory.tags),
           source_meeting_id = COALESCE(EXCLUDED.source_meeting_id, agent_memory.source_meeting_id),
           edit_count = agent_memory.edit_count + 1,
           last_edited_at = NOW(),
           updated_at = NOW()
         RETURNING id`,
        [
          params.agent_id,
          params.memory_type,
          params.key,
          JSON.stringify(params.value),
          params.confidence ?? 1.0,
          params.source ?? null,
          params.expires_at ?? null,
          params.memory_tier ?? 2,
          params.tags ?? [],
          params.meeting_id ?? null,
        ]
      );

      // Log diff if value changed
      if (existing.length > 0 && result.rows[0]) {
        const oldJson = JSON.stringify(existing[0].value);
        const newJson = JSON.stringify(params.value);
        if (oldJson !== newJson) {
          await pool.query(
            `INSERT INTO agent_memory_edits (memory_id, agent_id, old_value, new_value, edited_by, reason)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              result.rows[0].id,
              params.agent_id,
              JSON.stringify(existing[0].value),
              JSON.stringify(params.value),
              params.source ?? params.agent_id,
              params.meeting_id ? `board_meeting:${params.meeting_id}` : null,
            ]
          ).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[agent-memory] remember() failed:', err instanceof Error ? err.message : err);
      // Non-critical: don't break the main flow
    }
  }

  /**
   * Read memories for a specific agent.
   * Excludes expired entries. Orders by updated_at DESC.
   */
  async recall(agentId: string, memoryType?: string, limit = 10): Promise<MemoryEntry[]> {
    try {
      const { rows } = await pool.query<MemoryEntry>(
        `SELECT id, agent_id, memory_type, key, value, confidence::numeric AS confidence,
                source, expires_at::text, created_at::text, updated_at::text
         FROM agent_memory
         WHERE agent_id = $1
           AND ($2::text IS NULL OR memory_type = $2)
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY updated_at DESC
         LIMIT $3`,
        [agentId, memoryType ?? null, limit]
      );
      return rows;
    } catch (err) {
      console.error('[agent-memory] recall() failed:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  /**
   * Read memories across ALL agents (for cross-agent knowledge sharing).
   * Orders by confidence DESC, updated_at DESC.
   */
  async recallShared(memoryType?: string, limit = 20): Promise<MemoryEntry[]> {
    try {
      const { rows } = await pool.query<MemoryEntry>(
        `SELECT id, agent_id, memory_type, key, value, confidence::numeric AS confidence,
                source, expires_at::text, created_at::text, updated_at::text
         FROM agent_memory
         WHERE ($1::text IS NULL OR memory_type = $1)
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY confidence DESC, updated_at DESC
         LIMIT $2`,
        [memoryType ?? null, limit]
      );
      return rows;
    } catch (err) {
      console.error('[agent-memory] recallShared() failed:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  /**
   * Get a single memory entry by exact key.
   */
  async get(agentId: string, memoryType: string, key: string): Promise<MemoryEntry | null> {
    try {
      const { rows } = await pool.query<MemoryEntry>(
        `SELECT id, agent_id, memory_type, key, value, confidence::numeric AS confidence,
                source, expires_at::text, created_at::text, updated_at::text
         FROM agent_memory
         WHERE agent_id = $1 AND memory_type = $2 AND key = $3
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [agentId, memoryType, key]
      );
      return rows[0] ?? null;
    } catch (err) {
      console.error('[agent-memory] get() failed:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * Delete expired memories. Returns count of deleted rows.
   */
  async cleanup(): Promise<number> {
    try {
      const result = await pool.query(
        `DELETE FROM agent_memory WHERE expires_at IS NOT NULL AND expires_at < NOW()`
      );
      return result.rowCount ?? 0;
    } catch (err) {
      console.error('[agent-memory] cleanup() failed:', err instanceof Error ? err.message : err);
      return 0;
    }
  }

  /**
   * Count total memories (for diagnostics).
   */
  async count(): Promise<number> {
    try {
      const { rows } = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM agent_memory
         WHERE expires_at IS NULL OR expires_at > NOW()`
      );
      return parseInt(rows[0]?.cnt ?? '0', 10);
    } catch (err) {
      console.error('[agent-memory] count() failed:', err instanceof Error ? err.message : err);
      return 0;
    }
  }

  // ── Tier-based methods (Letta pattern) ───────────────────────────────────

  /**
   * Recall core memories (tier 1) — always included in agent system prompt.
   * These are the most important insights an agent has learned.
   */
  async recallCore(agentId: string, limit = 10): Promise<MemoryEntry[]> {
    try {
      const { rows } = await pool.query<MemoryEntry>(
        `SELECT id, agent_id, memory_type, key, value, confidence::numeric AS confidence,
                source, expires_at::text, created_at::text, updated_at::text,
                memory_tier, tags, edit_count
         FROM agent_memory
         WHERE agent_id = $1 AND memory_tier = 1
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY confidence DESC, updated_at DESC
         LIMIT $2`,
        [agentId, limit]
      );
      return rows;
    } catch (err) {
      console.error('[agent-memory] recallCore() failed:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  /**
   * Recall by tags — find memories across tiers matching specific tags.
   */
  async recallByTags(
    agentId: string,
    tags: string[],
    opts?: { matchAll?: boolean; since?: Date; limit?: number }
  ): Promise<MemoryEntry[]> {
    try {
      const matchOp = opts?.matchAll ? '@>' : '&&';
      const params: unknown[] = [agentId, tags, opts?.limit ?? 20];
      let dateFilter = '';
      if (opts?.since) {
        dateFilter = 'AND created_at > $4';
        params.push(opts.since.toISOString());
      }

      const { rows } = await pool.query<MemoryEntry>(
        `SELECT id, agent_id, memory_type, key, value, confidence::numeric AS confidence,
                source, expires_at::text, created_at::text, updated_at::text,
                memory_tier, tags, edit_count
         FROM agent_memory
         WHERE agent_id = $1 AND tags ${matchOp} $2
           AND (expires_at IS NULL OR expires_at > NOW())
           ${dateFilter}
         ORDER BY confidence DESC, updated_at DESC
         LIMIT $3`,
        params
      );
      return rows;
    } catch (err) {
      console.error('[agent-memory] recallByTags() failed:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  /**
   * Promote a memory to core tier (tier 1).
   * Only top insights should be core — they go into every prompt.
   */
  async promoteToCore(agentId: string, memoryType: string, key: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `UPDATE agent_memory SET memory_tier = 1, last_edited_at = NOW()
         WHERE agent_id = $1 AND memory_type = $2 AND key = $3`,
        [agentId, memoryType, key]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      console.error('[agent-memory] promoteToCore() failed:', err instanceof Error ? err.message : err);
      return false;
    }
  }

  /**
   * Compile core memory into a single system prompt block.
   * Called once per session instead of per-step.
   */
  async compileCoreSummary(agentId: string): Promise<string> {
    const core = await this.recallCore(agentId, 10);
    if (core.length === 0) return '';

    const lines = core.map(m => {
      const v = m.value as { summary?: string };
      const summary = v.summary ?? JSON.stringify(m.value).slice(0, 200);
      return `- [${m.memory_type}/${m.key}] ${summary} (conf: ${m.confidence})`;
    });

    return `=== CORE MEMORY (${core.length} items) ===\n${lines.join('\n')}`;
  }

  /**
   * Get edit history for a memory entry (diff audit trail).
   */
  async getEditHistory(memoryId: string, limit = 10): Promise<Array<{
    old_value: Record<string, unknown>;
    new_value: Record<string, unknown>;
    edited_by: string;
    reason: string | null;
    created_at: string;
  }>> {
    try {
      const { rows } = await pool.query(
        `SELECT old_value, new_value, edited_by, reason, created_at::text
         FROM agent_memory_edits
         WHERE memory_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [memoryId, limit]
      );
      return rows as Array<{
        old_value: Record<string, unknown>;
        new_value: Record<string, unknown>;
        edited_by: string;
        reason: string | null;
        created_at: string;
      }>;
    } catch (err) {
      console.error('[agent-memory] getEditHistory() failed:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  /**
   * Count edits per agent (detect churn/loops).
   */
  async getEditStats(agentId: string, sinceDays = 7): Promise<{ total_edits: number; unique_keys: number }> {
    try {
      const { rows } = await pool.query<{ total_edits: string; unique_keys: string }>(
        `SELECT COUNT(*)::text AS total_edits,
                COUNT(DISTINCT memory_id)::text AS unique_keys
         FROM agent_memory_edits
         WHERE agent_id = $1 AND created_at > NOW() - INTERVAL '1 day' * $2`,
        [agentId, sinceDays]
      );
      return {
        total_edits: parseInt(rows[0]?.total_edits ?? '0', 10),
        unique_keys: parseInt(rows[0]?.unique_keys ?? '0', 10),
      };
    } catch (err) {
      console.error('[agent-memory] getEditStats() failed:', err instanceof Error ? err.message : err);
      return { total_edits: 0, unique_keys: 0 };
    }
  }
}

export const agentMemory = new AgentMemory();
