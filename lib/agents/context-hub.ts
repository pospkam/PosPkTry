/**
 * ContextHub — единое хранилище контекста для всех агентов.
 *
 * 4 типа контекста:
 *   user      — роль, userId, история сессии
 *   task      — текущая задача (для многошаговых агентов)
 *   platform  — кэшированное знание о платформе (маршруты, операторы, туры)
 *   execution — состояние выполнения (имя агента, время старта)
 */

import { pool } from '@/lib/db-pool';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserContext {
  userId?: number;
  role: string;
  sessionMessages?: number;
}

export interface TaskContext {
  taskId?: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface PlatformContext {
  routesCount: number;
  activeOperators: number;
  toursCount: number;
}

export interface ExecutionContext {
  agentName: string;
  startedAt: Date;
}

export interface AgentContext {
  user: UserContext;
  task: TaskContext;
  platform: PlatformContext;
  execution: ExecutionContext;
  memories?: Array<{ key: string; value: Record<string, unknown>; confidence: number }>;
  /** Внешние сигналы из интернета — по domainId агента */
  external_signals?: Record<string, string>;
  /** Тема совещания (board meeting) */
  topic?: string | null;
  /** Rich briefing preamble injected from agent-context-v2 (metrics, history) */
  richBriefing?: string;
  /** Per-agent toolkit: real executable tools matching agent role */
  tools?: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>>;
  /** Preferred OpenRouter model ID for this agent's AI calls */
  preferredModel?: string | null;
}

// ── ContextHub ────────────────────────────────────────────────────────────────

const PLATFORM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

export class ContextHub {
  private platformCache: PlatformContext | null = null;
  private platformCacheAt = 0;

  async build(
    userId: number | undefined,
    role: string | undefined,
    agentName = 'platform-agent',
    taskContext: TaskContext = {}
  ): Promise<AgentContext> {
    const [user, platform] = await Promise.all([
      this.buildUserContext(userId, role),
      this.getPlatformContext(),
    ]);

    return {
      user,
      task: taskContext,
      platform,
      execution: {
        agentName,
        startedAt: new Date(),
      },
    };
  }

  private async buildUserContext(
    userId: number | undefined,
    role: string | undefined
  ): Promise<UserContext> {
    if (!userId) {
      return { role: role ?? 'tourist' };
    }
    try {
      const { rows } = await pool.query<{ role: string }>(
        `SELECT role FROM users WHERE id = $1 LIMIT 1`,
        [userId]
      );
      return {
        userId,
        role: rows[0]?.role ?? role ?? 'tourist',
      };
    } catch {
      return { userId, role: role ?? 'tourist' };
    }
  }

  async getPlatformContext(): Promise<PlatformContext> {
    const now = Date.now();
    if (this.platformCache && now - this.platformCacheAt < PLATFORM_CACHE_TTL_MS) {
      return this.platformCache;
    }
    try {
      const { rows } = await pool.query<{
        routes_count: number;
        active_operators: number;
        tours_count: number;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM agent_route_knowledge WHERE is_visible = TRUE)::int AS routes_count,
           (SELECT COUNT(*) FROM partners WHERE is_public = TRUE)::int AS active_operators,
           (SELECT COUNT(*) FROM operator_tours WHERE deleted_at IS NULL)::int AS tours_count`
      );
      this.platformCache = {
        routesCount: rows[0]?.routes_count ?? 0,
        activeOperators: rows[0]?.active_operators ?? 0,
        toursCount: rows[0]?.tours_count ?? 0,
      };
      this.platformCacheAt = now;
      return this.platformCache;
    } catch {
      return { routesCount: 0, activeOperators: 0, toursCount: 0 };
    }
  }

  /** Сбросить кэш платформы принудительно (например, после массовых изменений) */
  invalidatePlatformCache(): void {
    this.platformCache = null;
    this.platformCacheAt = 0;
  }
}
