/**
 * Agent Scheduler — Autonomous Agent Orchestration
 *
 * Agents run on schedule (every 4h minimum) to autonomously:
 * - Monitor system health (weather, bookings, compliance)
 * - Detect anomalies (SOS events, booking surge, refund spike)
 * - Generate alerts (cross-agent communication)
 * - Make tactical decisions (reschedule, price adjust, etc.)
 *
 * Uses Upstash Redis for distributed lock to prevent duplicate runs on multi-pod.
 * Uses simple interval scheduling for MVP (no complex cron syntax).
 */

import { Redis } from '@upstash/redis';
import { pool } from '@/lib/db-pool';

export interface ScheduledAgentConfig {
  agentId: string;           // admin | legal | security | hacker | rescue | eco | content | quality | evo
  intent: string;            // agent_health | agent_digest | evo_optimize | rescue_monitor | etc.
  intervalMs: number;        // run every N ms (e.g., 4 * 60 * 60 * 1000 = 4h)
  timeout: number;           // 60000 = 60s max execution
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class AgentScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private redis: Redis | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize Upstash Redis if URL provided
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      });
    }
  }

  /**
   * Initialize scheduler with agent configurations
   */
  async init(configs: ScheduledAgentConfig[]): Promise<void> {
    if (this.isInitialized) return;

    for (const config of configs) {
      if (!config.enabled) continue;

      const lockKey = `agent:lock:${config.agentId}`;
      const lastRunKey = `agent:lastrun:${config.agentId}`;

      // Start interval
      const interval = setInterval(async () => {
        // Try to acquire lock (prevent duplicate runs)
        const lockAcquired = await this.acquireLock(lockKey, 300); // 5min lock
        if (!lockAcquired) return;

        try {
          const startTime = Date.now();
          const result = await this.executeAgent(config);
          const duration = Date.now() - startTime;

          // Store last run metadata in Redis
          if (this.redis) {
            try {
              await this.redis.hset(lastRunKey, {
                lastRun: new Date().toISOString(),
                duration: duration.toString(),
                status: result.status,
                error: result.error || 'none'
              });
            } catch {
              // Redis metadata store failure is non-critical
            }
          }

          // Log to database for audit (schema: id, action_type, metadata, created_at)
          try {
            await pool.query(
              `INSERT INTO ai_actions_log (action_type, metadata, created_at)
               VALUES ($1, $2, NOW())`,
              [
                `agent_scheduled:${config.intent}`,
                JSON.stringify({
                  agent_id: config.agentId,
                  intent: config.intent,
                  status: result.status,
                  duration_ms: duration,
                  result_summary: result.summary || 'ok',
                  error: result.error || null
                })
              ]
            );
          } catch {
            // DB log failure is non-critical
          }
        } catch (err) {
          // Persist failure to DB so it's visible in audit log
          void pool.query(
            `INSERT INTO ai_actions_log (action_type, metadata, created_at) VALUES ($1, $2, NOW())`,
            [
              `agent_scheduled:${config.intent}`,
              JSON.stringify({ agent_id: config.agentId, status: 'error', error: err instanceof Error ? err.message : String(err) })
            ]
          ).catch(() => undefined);
        } finally {
          // Release lock
          if (this.redis) {
            try {
              await this.redis.del(lockKey);
            } catch (e) {
              console.warn(`[AgentScheduler] Failed to release lock: ${e}`);
            }
          }
        }
      }, config.intervalMs);

      this.intervals.set(`${config.agentId}:${config.intent}`, interval);
    }

    this.isInitialized = true;
  }

  /**
   * Execute agent with timeout protection
   */
  private async executeAgent(
    config: ScheduledAgentConfig
  ): Promise<{ status: 'success' | 'error' | 'timeout'; summary?: string; error?: string }> {
    try {
      // Dynamic import of agent
      const agencyName = this.agentIdToModule(config.agentId);
      const agentModule = await import(`@/lib/agents/agencies/${agencyName}`);

      const Agency = agentModule[this.agentIdToClass(config.agentId)];
      if (!Agency) {
        throw new Error(`Agency class not found for ${config.agentId}`);
      }

      const agency = new Agency();

      // Inject per-agent toolkit
      const { getToolkitForAgent } = await import('@/lib/agents/tools/agent-toolkits');
      const { getModelForAgent } = await import('@/lib/ai/agent-models');
      const agentContext = {
        tools: getToolkitForAgent(config.agentId),
        preferredModel: getModelForAgent(config.agentId),
      } as Record<string, unknown>;

      // Run with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Agent timeout')), config.timeout)
      );

      const result = await Promise.race([agency.run(config.intent, agentContext), timeoutPromise]);

      return {
        status: 'success',
        summary: result?.response?.substring(0, 100) || 'completed'
      };
    } catch (err) {
      return {
        status: err instanceof Error && err.message === 'Agent timeout' ? 'timeout' : 'error',
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Acquire distributed lock via Redis
   */
  private async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.redis) return true; // If no Redis, always acquire locally

    try {
      const result = await this.redis.set(key, Date.now().toString(), {
        ex: ttlSeconds,
        nx: true
      });
      return result === 'OK';
    } catch {
      return false;
    }
  }

  private agentIdToModule(id: string): string {
    const map: Record<string, string> = {
      admin: 'admin-agency',
      legal: 'legal-agency',
      security: 'security-agency',
      hacker: 'hacker-agency',
      rescue: 'rescue-agency',
      eco: 'eco-agency',
      content: 'content-auditor-agency',
      quality: 'quality-agency',
      evo: 'evolution-agency',
      planning: 'planning-agency',
      finance: 'finance-agency',
      infra: 'infra-agency',
      vibe_coder: 'vibe-coder-agency'
    };
    return map[id] || `${id}-agency`;
  }

  private agentIdToClass(id: string): string {
    const map: Record<string, string> = {
      admin: 'AdminAgency',
      legal: 'LegalAgency',
      security: 'SecurityAgency',
      hacker: 'HackerAgency',
      rescue: 'RescueAgency',
      eco: 'EcoAgency',
      content: 'ContentAuditorAgency',
      quality: 'QualityAgency',
      evo: 'EvolutionAgency',
      planning: 'PlanningAgency',
      finance: 'FinanceAgency',
      infra: 'InfraAgency',
      vibe_coder: 'VibeCoderAgency',
    };
    return map[id] || `${id.charAt(0).toUpperCase()}${id.slice(1)}Agency`;
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    for (const [_key, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.isInitialized = false;
  }

  /**
   * Get status of all scheduled jobs
   */
  getStatus(): Array<{ job: string; running: boolean }> {
    return Array.from(this.intervals.keys()).map(key => ({
      job: key,
      running: true
    }));
  }
}

// Production configuration — intervals scaled to actual platform activity.
// At pre-revenue stage (~1400 views/week, 0 leads), high-frequency monitoring wastes resources.
// Increase frequencies when metrics cross thresholds (e.g., 10+ leads/day → restore 30min rescue).
export const DEFAULT_AGENT_SCHEDULE: ScheduledAgentConfig[] = [
  // Admin: digest every 12h (twice daily is enough at current scale)
  {
    agentId: 'admin',
    intent: 'admin_digest',
    intervalMs: 12 * 60 * 60 * 1000,
    timeout: 60000,
    enabled: true
  },

  // Rescue: monitor SOS every 4h (no incidents at current scale; restore 30min when live bookings exist)
  {
    agentId: 'rescue',
    intent: 'rescue_sos_stats',
    intervalMs: 4 * 60 * 60 * 1000,
    timeout: 30000,
    enabled: true
  },

  // Hacker: growth analysis every 24h (no growth data to analyze more often)
  {
    agentId: 'hacker',
    intent: 'hack_growth',
    intervalMs: 24 * 60 * 60 * 1000,
    timeout: 45000,
    enabled: true
  },

  // Evo: self-optimize every 24h
  {
    agentId: 'evo',
    intent: 'evo_optimize',
    intervalMs: 24 * 60 * 60 * 1000,
    timeout: 120000,
    enabled: true
  },

  // Quality: review trends every 24h (no reviews/ratings coming in)
  {
    agentId: 'quality',
    intent: 'qa_operators',
    intervalMs: 24 * 60 * 60 * 1000,
    timeout: 45000,
    enabled: true
  },

  // Eco: monitor platform load every 12h (near-zero load)
  {
    agentId: 'eco',
    intent: 'eco_impact',
    intervalMs: 12 * 60 * 60 * 1000,
    timeout: 30000,
    enabled: true
  },

  // Security: audit every 12h (no auth events to audit more often)
  {
    agentId: 'security',
    intent: 'sec_report',
    intervalMs: 12 * 60 * 60 * 1000,
    timeout: 45000,
    enabled: true
  },

  // Legal: compliance check once per day
  {
    agentId: 'legal',
    intent: 'legal_risks',
    intervalMs: 24 * 60 * 60 * 1000,
    timeout: 30000,
    enabled: true
  },

  // Content: audit every 24h (no new content being added)
  {
    agentId: 'content',
    intent: 'content_audit',
    intervalMs: 24 * 60 * 60 * 1000,
    timeout: 45000,
    enabled: true
  },

  // Planning: forecast every 24h
  {
    agentId: 'planning',
    intent: 'plan_forecast',
    intervalMs: 24 * 60 * 60 * 1000,
    timeout: 45000,
    enabled: true
  },

  // Finance: revenue check every 24h (0 revenue)
  {
    agentId: 'finance',
    intent: 'finance_report',
    intervalMs: 24 * 60 * 60 * 1000,
    timeout: 45000,
    enabled: true
  },

  // Infra: health check every 6h (was 1h, generating false alerts)
  {
    agentId: 'infra',
    intent: 'infra_health',
    intervalMs: 6 * 60 * 60 * 1000,
    timeout: 30000,
    enabled: true
  },

  // VibeCoder: code analysis every 24h
  {
    agentId: 'vibe_coder',
    intent: 'code_analysis',
    intervalMs: 24 * 60 * 60 * 1000,
    timeout: 60000,
    enabled: true
  },
];

// Singleton instance
let schedulerInstance: AgentScheduler | null = null;

export function getScheduler(): AgentScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new AgentScheduler();
  }
  return schedulerInstance;
}

export async function initializeScheduler(): Promise<void> {
  const scheduler = getScheduler();
  await scheduler.init(DEFAULT_AGENT_SCHEDULE);
}

export async function shutdownScheduler(): Promise<void> {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}
