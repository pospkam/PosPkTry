/**
 * AgentMemory — persistent cross-run knowledge store for AI agents.
 *
 * Agents remember insights, patterns, prompt improvements, and director decisions.
 * Supports TTL via expires_at and cross-agent knowledge sharing via recallShared().
 *
 * Table: agent_memory (migration 064)
 */

import { pool } from '@/lib/db-pool';

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
}

interface RememberParams {
  agent_id: string;
  memory_type: string;
  key: string;
  value: Record<string, unknown>;
  confidence?: number;
  source?: string;
  expires_at?: Date;
}

export class AgentMemory {
  /**
   * Upsert a memory entry. If the same (agent_id, memory_type, key) exists,
   * it gets updated with new value and confidence.
   */
  async remember(params: RememberParams): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO agent_memory (agent_id, memory_type, key, value, confidence, source, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (agent_id, memory_type, key) DO UPDATE SET
           value = EXCLUDED.value,
           confidence = EXCLUDED.confidence,
           source = EXCLUDED.source,
           expires_at = EXCLUDED.expires_at,
           updated_at = NOW()`,
        [
          params.agent_id,
          params.memory_type,
          params.key,
          JSON.stringify(params.value),
          params.confidence ?? 1.0,
          params.source ?? null,
          params.expires_at ?? null,
        ]
      );
    } catch {
      // Memory writes are non-critical — never break the main flow
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      return 0;
    }
  }
}

export const agentMemory = new AgentMemory();
