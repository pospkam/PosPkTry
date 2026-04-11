/**
 * KnowledgeBase — permanent agent knowledge store with FTS.
 *
 * Unlike agent_memory (TTL-based, 7-day expiry), knowledge pages are permanent.
 * Each page has:
 *   - compiled_truth: current summary (overwritten on updates)
 *   - timeline: append-only chronology
 *   - search_vector: auto-generated tsvector for Russian FTS
 *
 * Table: agent_knowledge (migration 648)
 */

import { pool } from '@/lib/db-pool';

export interface KnowledgePage {
  id: number;
  slug: string;
  type: string;
  title: string;
  compiled_truth: string;
  timeline: string;
  metadata: Record<string, unknown>;
  agent_id: string | null;
  edit_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeLink {
  id: number;
  from_slug: string;
  to_slug: string;
  link_type: string;
  context: string;
  created_at: string;
}

interface UpsertParams {
  slug: string;
  type: string;
  title: string;
  compiled_truth: string;
  metadata?: Record<string, unknown>;
  agent_id?: string;
}

interface SearchOptions {
  type?: string;
  limit?: number;
}

interface ListOptions {
  type?: string;
  agent_id?: string;
  limit?: number;
  offset?: number;
}

export class KnowledgeBase {
  /**
   * Create or update a knowledge page.
   * On conflict: overwrites compiled_truth, merges metadata, increments edit_count.
   */
  async upsert(params: UpsertParams): Promise<KnowledgePage | null> {
    try {
      const { rows } = await pool.query<KnowledgePage>(
        `INSERT INTO agent_knowledge (slug, type, title, compiled_truth, metadata, agent_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET
           type = EXCLUDED.type,
           title = EXCLUDED.title,
           compiled_truth = EXCLUDED.compiled_truth,
           metadata = agent_knowledge.metadata || EXCLUDED.metadata,
           agent_id = COALESCE(EXCLUDED.agent_id, agent_knowledge.agent_id),
           edit_count = agent_knowledge.edit_count + 1
         RETURNING id, slug, type, title, compiled_truth, timeline,
                   metadata, agent_id, edit_count,
                   created_at::text, updated_at::text`,
        [
          params.slug,
          params.type,
          params.title,
          params.compiled_truth,
          JSON.stringify(params.metadata ?? {}),
          params.agent_id ?? null,
        ]
      );
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get a single page by slug.
   */
  async get(slug: string): Promise<KnowledgePage | null> {
    try {
      const { rows } = await pool.query<KnowledgePage>(
        `SELECT id, slug, type, title, compiled_truth, timeline,
                metadata, agent_id, edit_count,
                created_at::text, updated_at::text
         FROM agent_knowledge WHERE slug = $1`,
        [slug]
      );
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Full-text search with Russian dictionary + ILIKE fallback.
   * Returns pages ranked by ts_rank (weighted: title A, truth B, timeline C).
   */
  async search(query: string, opts?: SearchOptions): Promise<KnowledgePage[]> {
    const limit = opts?.limit ?? 10;
    try {
      // Try FTS first
      const typeFilter = opts?.type ? 'AND type = $3' : '';
      const params: unknown[] = [query, limit];
      if (opts?.type) params.push(opts.type);

      const { rows } = await pool.query<KnowledgePage>(
        `SELECT id, slug, type, title, compiled_truth, timeline,
                metadata, agent_id, edit_count,
                created_at::text, updated_at::text,
                ts_rank(search_vector, plainto_tsquery('russian', $1)) AS rank
         FROM agent_knowledge
         WHERE search_vector @@ plainto_tsquery('russian', $1)
           ${typeFilter}
         ORDER BY rank DESC
         LIMIT $2`,
        params
      );

      // If FTS returns nothing, fallback to ILIKE (fuzzy via pg_trgm)
      if (rows.length === 0) {
        const ilike = `%${query}%`;
        const fParams: unknown[] = [ilike, limit];
        const fTypeFilter = opts?.type ? 'AND type = $3' : '';
        if (opts?.type) fParams.push(opts.type);

        const { rows: fRows } = await pool.query<KnowledgePage>(
          `SELECT id, slug, type, title, compiled_truth, timeline,
                  metadata, agent_id, edit_count,
                  created_at::text, updated_at::text
           FROM agent_knowledge
           WHERE (title ILIKE $1 OR compiled_truth ILIKE $1)
             ${fTypeFilter}
           ORDER BY updated_at DESC
           LIMIT $2`,
          fParams
        );
        return fRows;
      }

      return rows;
    } catch {
      return [];
    }
  }

  /**
   * List pages with optional filters.
   */
  async list(opts?: ListOptions): Promise<KnowledgePage[]> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (opts?.type) {
        conditions.push(`type = $${paramIdx++}`);
        params.push(opts.type);
      }
      if (opts?.agent_id) {
        conditions.push(`agent_id = $${paramIdx++}`);
        params.push(opts.agent_id);
      }

      params.push(limit, offset);
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows } = await pool.query<KnowledgePage>(
        `SELECT id, slug, type, title, compiled_truth, timeline,
                metadata, agent_id, edit_count,
                created_at::text, updated_at::text
         FROM agent_knowledge
         ${where}
         ORDER BY updated_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        params
      );
      return rows;
    } catch {
      return [];
    }
  }

  /**
   * Append an entry to the timeline (append-only, never overwrites).
   */
  async appendTimeline(slug: string, entry: string): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString().slice(0, 16);
      const line = `\n[${timestamp}] ${entry}`;
      const result = await pool.query(
        `UPDATE agent_knowledge
         SET timeline = timeline || $2,
             edit_count = edit_count + 1
         WHERE slug = $1`,
        [slug, line]
      );
      return (result.rowCount ?? 0) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Create a link between two knowledge pages.
   */
  async link(fromSlug: string, toSlug: string, linkType: string, context?: string): Promise<boolean> {
    try {
      await pool.query(
        `INSERT INTO agent_knowledge_links (from_slug, to_slug, link_type, context)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (from_slug, to_slug) DO NOTHING`,
        [fromSlug, toSlug, linkType, context ?? '']
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all links for a page (bidirectional).
   */
  async getLinks(slug: string): Promise<KnowledgeLink[]> {
    try {
      const { rows } = await pool.query<KnowledgeLink>(
        `SELECT id, from_slug, to_slug, link_type, context, created_at::text
         FROM agent_knowledge_links
         WHERE from_slug = $1 OR to_slug = $1
         ORDER BY created_at DESC`,
        [slug]
      );
      return rows;
    } catch {
      return [];
    }
  }

  /**
   * Count total knowledge pages (for diagnostics).
   */
  async count(type?: string): Promise<number> {
    try {
      const { rows } = await pool.query<{ cnt: string }>(
        type
          ? `SELECT COUNT(*)::text AS cnt FROM agent_knowledge WHERE type = $1`
          : `SELECT COUNT(*)::text AS cnt FROM agent_knowledge`,
        type ? [type] : []
      );
      return parseInt(rows[0]?.cnt ?? '0', 10);
    } catch {
      return 0;
    }
  }
}

export const knowledgeBase = new KnowledgeBase();
