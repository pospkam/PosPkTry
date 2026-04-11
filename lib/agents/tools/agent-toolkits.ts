/**
 * lib/agents/tools/agent-toolkits.ts
 *
 * Per-agent toolkits: real executable functions for each Board Director.
 * Each agent gets a set of tools matching its role.
 *
 * Tools wrap existing infrastructure:
 *  - board-executor-tools.ts (sendBoardAlert, runDiagnosticQuery)
 *  - planner-intelligence.ts (fetchWeatherForecast, computeQualityScore)
 *  - routes-recommender.ts (parseInterestsFromText)
 *  - agent-memory.ts (recallShared)
 *  - emit.ts (emitEvent)
 *  - telegram.ts (telegramService)
 *  - db-pool.ts (parameterized SQL)
 *
 * All tool calls are logged to ai_actions_log for audit.
 */

import { pool } from '@/lib/db-pool';
import { sendBoardAlert, runDiagnosticQuery, type ToolResult } from './board-executor-tools';
import { emitEvent } from '@/lib/events/emit';
import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { knowledgeBase } from '@/lib/agents/memory/agent-knowledge';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentToolFn = (...args: unknown[]) => Promise<ToolResult>;
export type AgentToolkit = Record<string, AgentToolFn>;

export { type ToolResult };

// ── Audit Wrapper ─────────────────────────────────────────────────────────────

function withAudit(agentId: string, toolName: string, fn: AgentToolFn): AgentToolFn {
  return async (...args: unknown[]): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      pool.query(
        `INSERT INTO ai_actions_log (action_type, metadata)
         VALUES ($1, $2)`,
        [`tool_${toolName}`, JSON.stringify({
          agent_id: agentId, tool: toolName, status: result.success ? 'success' : 'error',
          args: args.slice(0, 3), duration_ms: Date.now() - start,
          message: result.message.slice(0, 500),
        })]
      ).catch(() => { /* non-critical audit log */ });
      return result;
    } catch (err) {
      pool.query(
        `INSERT INTO ai_actions_log (action_type, metadata)
         VALUES ($1, $2)`,
        [`tool_${toolName}`, JSON.stringify({
          agent_id: agentId, tool: toolName, status: 'error',
          error: err instanceof Error ? err.message : String(err),
          duration_ms: Date.now() - start,
        })]
      ).catch(() => { /* non-critical */ });
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  };
}

// ── Shared Tool Factories ─────────────────────────────────────────────────────

function makeSendAlert(agentId: string, agentName: string): AgentToolFn {
  return async (message: unknown) => {
    return sendBoardAlert(agentName, 'auto_alert', String(message));
  };
}

function makeRunDiagnostic(): AgentToolFn {
  return async (sql: unknown, label?: unknown) => {
    return runDiagnosticQuery(String(sql), typeof label === 'string' ? label : 'diagnostic');
  };
}

function makeRecallShared(): AgentToolFn {
  return async (memoryType?: unknown, limit?: unknown) => {
    try {
      const entries = await agentMemory.recallShared(
        typeof memoryType === 'string' ? memoryType : undefined,
        typeof limit === 'number' ? limit : 20
      );
      return {
        success: true,
        message: `${entries.length} shared memories found`,
        details: { entries: entries.slice(0, 20).map(e => ({
          agent_id: e.agent_id, key: e.key, memory_type: e.memory_type,
          confidence: e.confidence, value: e.value,
        })) },
      };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  };
}

function makeEmitEvent(agentId: string): AgentToolFn {
  return async (type: unknown, severity: unknown, data: unknown) => {
    const sev = (typeof severity === 'string' && ['critical', 'warning', 'info'].includes(severity))
      ? severity as 'critical' | 'warning' | 'info'
      : 'info';
    emitEvent(String(type), agentId, sev, typeof data === 'object' && data !== null ? data as Record<string, unknown> : {});
    return { success: true, message: `Event ${String(type)} emitted` };
  };
}

function makeRememberForKuzmich(agentId: string): AgentToolFn {
  return async (key: unknown, message: unknown) => {
    try {
      await agentMemory.remember({
        agent_id: agentId,
        memory_type: 'zone_alert',
        key: String(key),
        value: { message: String(message), created_at: new Date().toISOString() },
        confidence: 0.9,
        source: `${agentId}_tool`,
      });
      return { success: true, message: `Zone warning saved: ${String(key)}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  };
}

function makeBrainSearch(agentId: string): AgentToolFn {
  return async (query: unknown, type?: unknown, limit?: unknown) => {
    try {
      const pages = await knowledgeBase.search(
        String(query),
        {
          type: typeof type === 'string' ? type : undefined,
          limit: typeof limit === 'number' ? limit : 10,
        }
      );
      return {
        success: true,
        message: `${pages.length} knowledge pages found`,
        details: { pages: pages.map(p => ({
          slug: p.slug, type: p.type, title: p.title,
          compiled_truth: p.compiled_truth.slice(0, 300),
          updated_at: p.updated_at,
        })) },
      };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  };
}

function makeBrainWrite(agentId: string): AgentToolFn {
  return async (slug: unknown, type: unknown, title: unknown, compiledTruth: unknown, metadata?: unknown) => {
    try {
      const page = await knowledgeBase.upsert({
        slug: String(slug),
        type: String(type),
        title: String(title),
        compiled_truth: String(compiledTruth),
        metadata: typeof metadata === 'object' && metadata !== null ? metadata as Record<string, unknown> : {},
        agent_id: agentId,
      });
      if (!page) return { success: false, message: 'Upsert returned null' };
      return {
        success: true,
        message: `Knowledge page "${page.slug}" saved (edit #${page.edit_count})`,
        details: { slug: page.slug, edit_count: page.edit_count },
      };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  };
}

// ── Per-Agent Toolkit Builders ────────────────────────────────────────────────

function buildRescueToolkit(agentId: string): AgentToolkit {
  return {
    fetchWeather: withAudit(agentId, 'fetchWeather', async (lat: unknown, lng: unknown, days: unknown) => {
      const { fetchWeatherForecast } = await import('@/lib/services/planner-intelligence');
      const forecast = await fetchWeatherForecast(
        typeof lat === 'number' ? lat : 53.0,
        typeof lng === 'number' ? lng : 158.6,
        typeof days === 'number' ? days : 3
      );
      return {
        success: true,
        message: `${forecast.length}-day forecast loaded`,
        details: { forecast },
      };
    }),
    emitWeatherAlert: withAudit(agentId, 'emitWeatherAlert', async (zone: unknown, message: unknown) => {
      emitEvent('WEATHER_ALERT', agentId, 'warning', { zone: String(zone), message: String(message) });
      return { success: true, message: `Weather alert emitted for zone ${String(zone)}` };
    }),
    sendSosAlert: withAudit(agentId, 'sendSosAlert', makeSendAlert(agentId, 'Rescue')),
    getActiveIncidents: withAudit(agentId, 'getActiveIncidents', async () => {
      const { rows } = await pool.query<{
        id: string; status: string; lat: number | null; lng: number | null;
        created_at: string; age_minutes: string;
      }>(
        `SELECT id, status, lat::float, lng::float, created_at,
          EXTRACT(EPOCH FROM NOW() - created_at)::int / 60 AS age_minutes
        FROM sos_events WHERE status != 'resolved'
        ORDER BY created_at DESC LIMIT 20`
      );
      return {
        success: true,
        message: `${rows.length} active incidents`,
        details: { incidents: rows },
      };
    }),
  };
}

function buildSecurityToolkit(agentId: string): AgentToolkit {
  return {
    runDiagnostic: withAudit(agentId, 'runDiagnostic', makeRunDiagnostic()),
    sendSecurityAlert: withAudit(agentId, 'sendSecurityAlert', makeSendAlert(agentId, 'Security')),
    emitAnomaly: withAudit(agentId, 'emitAnomaly', async (details: unknown) => {
      emitEvent('ANOMALY_DETECTED', agentId, 'warning', typeof details === 'object' && details !== null ? details as Record<string, unknown> : { info: String(details) });
      return { success: true, message: 'Anomaly event emitted' };
    }),
    getFailedActions: withAudit(agentId, 'getFailedActions', async (hours: unknown) => {
      const h = typeof hours === 'number' ? hours : 24;
      const { rows } = await pool.query<{
        action_type: string; count: string; last_seen: string;
      }>(
        `SELECT action_type, COUNT(*)::text AS count, MAX(created_at)::text AS last_seen
        FROM ai_actions_log
        WHERE metadata->>'error' IS NOT NULL
          AND created_at >= NOW() - INTERVAL '1 hour' * $1
        GROUP BY action_type ORDER BY count DESC LIMIT 20`,
        [h]
      );
      return { success: true, message: `${rows.length} failed action types`, details: { failures: rows } };
    }),
    proposeSecurityBlock: withAudit(agentId, 'proposeSecurityBlock', async (blockType: unknown, target: unknown, reason: unknown) => {
      const ctx: Record<string, unknown> = {
        block_type: String(blockType),
        reason: String(reason),
      };
      if (String(blockType) === 'ip') {
        ctx.ip = String(target);
        ctx.duration_hours = 24;
      } else {
        ctx.user_id = String(target);
      }
      await pool.query(
        `INSERT INTO agent_approvals (agent_id, action_type, description, context, status)
         VALUES ('security', 'security_block', $1, $2, 'pending')`,
        [
          `Блокировка ${String(blockType)} ${String(target)}: ${String(reason).slice(0, 200)}`,
          JSON.stringify(ctx),
        ]
      );
      return { success: true, message: `Инициатива security_block создана` };
    }),
  };
}

function buildAdminToolkit(agentId: string): AgentToolkit {
  return {
    sendDigestNotification: withAudit(agentId, 'sendDigestNotification', async (message: unknown) => {
      const { telegramService } = await import('@/lib/notifications/telegram');
      const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID ?? process.env.TELEGRAM_FISHING_CHAT_ID;
      if (!chatId) return { success: false, message: 'No admin chat ID configured' };
      const resp = await telegramService.sendMessage({ chatId, text: String(message), parseMode: 'HTML' });
      return { success: resp.success, message: resp.success ? 'Digest sent' : (resp.error ?? 'Send failed') };
    }),
    runDiagnostic: withAudit(agentId, 'runDiagnostic', makeRunDiagnostic()),
    recallSharedMemory: withAudit(agentId, 'recallSharedMemory', makeRecallShared()),
    emitEvent: withAudit(agentId, 'emitEvent', makeEmitEvent(agentId)),
  };
}

function buildEcoToolkit(agentId: string): AgentToolkit {
  return {
    emitZoneAlert: withAudit(agentId, 'emitZoneAlert', async (zone: unknown, load: unknown, message: unknown) => {
      emitEvent('ROUTE_HAZARD', agentId, 'warning', {
        zone: String(zone), load: String(load), message: String(message),
      });
      return { success: true, message: `Zone alert emitted: ${String(zone)}` };
    }),
    writeZoneWarning: withAudit(agentId, 'writeZoneWarning', makeRememberForKuzmich(agentId)),
    getBookingsByZone: withAudit(agentId, 'getBookingsByZone', async (zone: unknown) => {
      const { rows } = await pool.query<{
        zone: string; booking_count: string; tourist_count: string;
      }>(
        `SELECT
          ark.zone AS zone,
          COUNT(DISTINCT ob.id)::text AS booking_count,
          COALESCE(SUM(ob.participants), 0)::text AS tourist_count
        FROM operator_tours ot
        JOIN agent_route_knowledge ark ON ot.agent_route_id = ark.id
        LEFT JOIN operator_bookings ob ON ob.operator_tour_id = ot.id
          AND ob.deleted_at IS NULL
          AND ob.created_at >= NOW() - INTERVAL '30 days'
        WHERE ark.zone = $1
        GROUP BY ark.zone`,
        [String(zone)]
      );
      return {
        success: true,
        message: rows.length > 0 ? `Zone ${String(zone)}: ${rows[0].booking_count} bookings` : 'No data',
        details: { zoneStats: rows[0] ?? null },
      };
    }),
    proposeZoneCapacity: withAudit(agentId, 'proposeZoneCapacity', async (zone: unknown, maxDaily: unknown, reason: unknown) => {
      await pool.query(
        `INSERT INTO agent_approvals (agent_id, action_type, description, context, status)
         VALUES ('eco', 'zone_capacity', $1, $2, 'pending')`,
        [
          `Лимит зоны "${String(zone)}": ${String(maxDaily)} чел/день — ${String(reason).slice(0, 200)}`,
          JSON.stringify({ zone: String(zone), max_daily_visitors: Number(maxDaily), reason: String(reason) }),
        ]
      );
      return { success: true, message: `Инициатива zone_capacity создана для зоны ${String(zone)}` };
    }),
  };
}

function buildFinanceToolkit(agentId: string): AgentToolkit {
  return {
    getPaymentHealth: withAudit(agentId, 'getPaymentHealth', async () => {
      const { rows } = await pool.query<{
        stuck_held: string; overdue_commissions: string; pending_payouts: string;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM operator_bookings
            WHERE payment_status = 'held'
              AND created_at < NOW() - INTERVAL '48 hours'
              AND deleted_at IS NULL)::text AS stuck_held,
          (SELECT COUNT(*) FROM agent_commissions
            WHERE status = 'pending'
              AND created_at < NOW() - INTERVAL '7 days')::text AS overdue_commissions,
          (SELECT COUNT(*) FROM agent_commissions
            WHERE status = 'pending')::text AS pending_payouts`
      );
      return {
        success: true,
        message: `Payment health: ${rows[0].stuck_held} stuck, ${rows[0].overdue_commissions} overdue`,
        details: { health: rows[0] },
      };
    }),
    sendFinanceAlert: withAudit(agentId, 'sendFinanceAlert', makeSendAlert(agentId, 'Finance')),
    emitPriceAnomaly: withAudit(agentId, 'emitPriceAnomaly', async (tourId: unknown, details: unknown) => {
      emitEvent('PRICE_ANOMALY', agentId, 'warning', {
        tour_id: String(tourId),
        ...(typeof details === 'object' && details !== null ? details as Record<string, unknown> : {}),
      });
      return { success: true, message: `Price anomaly emitted for tour ${String(tourId)}` };
    }),
    proposeFlagPayment: withAudit(agentId, 'proposeFlagPayment', async (bookingId: unknown, reason: unknown, flagType: unknown) => {
      await pool.query(
        `INSERT INTO agent_approvals (agent_id, action_type, description, context, status)
         VALUES ('finance', 'flag_payment', $1, $2, 'pending')`,
        [
          `Пометить платёж ${String(bookingId)}: ${String(reason).slice(0, 200)}`,
          JSON.stringify({ booking_id: String(bookingId), reason: String(reason), flag_type: String(flagType || 'suspicious') }),
        ]
      );
      return { success: true, message: `Инициатива flag_payment создана` };
    }),
  };
}

function buildInfraToolkit(agentId: string): AgentToolkit {
  return {
    probeAIProviders: withAudit(agentId, 'probeAIProviders', async () => {
      // OR_API_KEY — primary name; OPENROUTER_API_KEY — legacy alias
      const orEnvKey = process.env.OR_API_KEY ? 'OR_API_KEY' : 'OPENROUTER_API_KEY';
      const providers: Array<{ name: string; url: string; envKey: string; softCheck?: boolean }> = [
        { name: 'Timeweb', url: 'https://api.timeweb.cloud/v2/ai', envKey: 'TIMEWEB_TOKEN' },
        { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/models', envKey: orEnvKey },
        // Anthropic geo-blocked from Russia — soft check: unreachable ≠ critical failure
        { name: 'Anthropic', url: 'https://api.anthropic.com/v1/messages', envKey: 'ANTHROPIC_API_KEY', softCheck: true },
      ];
      const results: Record<string, string> = {};
      await Promise.allSettled(providers.map(async (p) => {
        if (!process.env[p.envKey]) {
          results[p.name] = 'no_key';
          return;
        }
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5000);
          const resp = await fetch(p.url, { method: 'HEAD', signal: ctrl.signal });
          clearTimeout(timer);
          const reachableStatuses = new Set([200, 401, 403, 405, 422]);
          results[p.name] = resp.ok || reachableStatuses.has(resp.status) ? 'reachable' : `status_${resp.status}`;
        } catch {
          results[p.name] = p.softCheck ? 'geo_blocked' : 'unreachable';
        }
      }));
      const OK = new Set(['reachable', 'no_key', 'geo_blocked']);
      const allReachable = Object.values(results).every(v => OK.has(v));
      return {
        success: allReachable,
        message: allReachable ? 'All providers healthy' : 'Some providers unhealthy',
        details: { providers: results },
      };
    }),
    getCronStatus: withAudit(agentId, 'getCronStatus', async () => {
      const { rows } = await pool.query<{
        action_type: string; last_run: string; run_count: string;
      }>(
        `SELECT action_type,
          MAX(created_at)::text AS last_run,
          COUNT(*)::text AS run_count
        FROM ai_actions_log
        WHERE (action_type LIKE 'cron_%' OR action_type LIKE 'agent_scheduled:%')
          AND created_at >= NOW() - INTERVAL '48 hours'
        GROUP BY action_type
        ORDER BY MAX(created_at) DESC`
      );
      return { success: true, message: `${rows.length} cron types active`, details: { crons: rows } };
    }),
    sendInfraAlert: withAudit(agentId, 'sendInfraAlert', makeSendAlert(agentId, 'Infra')),
    runDiagnostic: withAudit(agentId, 'runDiagnostic', makeRunDiagnostic()),
    emitRateLimitHit: withAudit(agentId, 'emitRateLimitHit', async (details: unknown) => {
      emitEvent('RATE_LIMIT_HIT', agentId, 'warning', typeof details === 'object' && details !== null ? details as Record<string, unknown> : {});
      return { success: true, message: 'Rate limit event emitted' };
    }),
  };
}

function buildHackerToolkit(agentId: string): AgentToolkit {
  return {
    getDemandSignals: withAudit(agentId, 'getDemandSignals', async (days: unknown) => {
      const d = typeof days === 'number' ? days : 30;
      try {
        const entries = await agentMemory.recall('planning', 'tourist_demand', 20);
        const recent = entries.filter(e => {
          const created = new Date(e.created_at);
          return created >= new Date(Date.now() - d * 86400000);
        });
        return {
          success: true,
          message: `${recent.length} demand signals (${d}d)`,
          details: { signals: recent.map(e => e.value) },
        };
      } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : String(err) };
      }
    }),
    getConversionFunnel: withAudit(agentId, 'getConversionFunnel', async () => {
      const { rows } = await pool.query<{
        stage: string; count: string;
      }>(
        `SELECT 'page_views' AS stage, COUNT(*)::text AS count FROM page_views WHERE created_at >= NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT 'leads', COUNT(*)::text FROM leads WHERE created_at >= NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT 'bookings', COUNT(*)::text FROM operator_bookings WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL`
      );
      return { success: true, message: 'Funnel data loaded', details: { funnel: rows } };
    }),
    emitConversionDrop: withAudit(agentId, 'emitConversionDrop', async (details: unknown) => {
      emitEvent('CONVERSION_DROP', agentId, 'warning', typeof details === 'object' && details !== null ? details as Record<string, unknown> : {});
      return { success: true, message: 'Conversion drop event emitted' };
    }),
  };
}

function buildQualityToolkit(agentId: string): AgentToolkit {
  return {
    computeScore: withAudit(agentId, 'computeScore', async (params: unknown) => {
      const { computeQualityScore } = await import('@/lib/services/planner-intelligence');
      const p = typeof params === 'object' && params !== null ? params as Record<string, unknown> : {};
      const score = computeQualityScore({
        tourRating: typeof p.tourRating === 'number' ? p.tourRating : null,
        tourReviewCount: typeof p.tourReviewCount === 'number' ? p.tourReviewCount : 0,
        operatorRating: typeof p.operatorRating === 'number' ? p.operatorRating : 0,
        operatorReviewCount: typeof p.operatorReviewCount === 'number' ? p.operatorReviewCount : 0,
        operatorVerified: p.operatorVerified === true,
        recentPositivePercent: typeof p.recentPositivePercent === 'number' ? p.recentPositivePercent : 0,
        verifiedReviewCount: typeof p.verifiedReviewCount === 'number' ? p.verifiedReviewCount : 0,
      });
      return { success: true, message: `Quality score: ${score}/100`, details: { score } };
    }),
    getRecentBadReviews: withAudit(agentId, 'getRecentBadReviews', async (days: unknown) => {
      const d = typeof days === 'number' ? days : 7;
      const { rows } = await pool.query<{
        id: string; rating: number; text: string; tour_title: string;
        operator_name: string; created_at: string;
      }>(
        `SELECT r.id::text, r.rating, LEFT(r.comment, 200) AS text,
          ot.title AS tour_title, p.name AS operator_name,
          r.created_at::text
        FROM operator_tour_reviews r
        JOIN operator_tours ot ON r.tour_id = ot.id
        JOIN partners p ON ot.operator_id = p.id
        WHERE r.rating <= 2 AND r.created_at >= NOW() - INTERVAL '1 day' * $1
        ORDER BY r.created_at DESC LIMIT 20`,
        [d]
      );
      return {
        success: true,
        message: `${rows.length} bad reviews (${d}d)`,
        details: { reviews: rows },
      };
    }),
    emitNegativeFeedback: withAudit(agentId, 'emitNegativeFeedback', async (tourId: unknown, details: unknown) => {
      emitEvent('NEGATIVE_FEEDBACK', agentId, 'warning', {
        tour_id: String(tourId),
        ...(typeof details === 'object' && details !== null ? details as Record<string, unknown> : {}),
      });
      return { success: true, message: 'Negative feedback event emitted' };
    }),
    sendQualityAlert: withAudit(agentId, 'sendQualityAlert', makeSendAlert(agentId, 'Quality')),
    proposeTourSuspend: withAudit(agentId, 'proposeTourSuspend', async (tourId: unknown, reason: unknown) => {
      await pool.query(
        `INSERT INTO agent_approvals (agent_id, action_type, description, context, status)
         VALUES ('quality', 'tour_suspend', $1, $2, 'pending')`,
        [
          `Приостановить тур ID ${String(tourId)}: ${String(reason).slice(0, 200)}`,
          JSON.stringify({ tour_id: Number(tourId), reason: String(reason) }),
        ]
      );
      return { success: true, message: `Инициатива tour_suspend создана для тура ${String(tourId)}` };
    }),
    proposeOperatorWarning: withAudit(agentId, 'proposeOperatorWarning', async (operatorId: unknown, message: unknown, severity: unknown) => {
      await pool.query(
        `INSERT INTO agent_approvals (agent_id, action_type, description, context, status)
         VALUES ('quality', 'operator_warning', $1, $2, 'pending')`,
        [
          `Предупреждение оператору ${String(operatorId)}: ${String(message).slice(0, 200)}`,
          JSON.stringify({ operator_id: String(operatorId), message: String(message), severity: String(severity || 'warning') }),
        ]
      );
      return { success: true, message: `Инициатива operator_warning создана` };
    }),
  };
}

function buildContentToolkit(agentId: string): AgentToolkit {
  return {
    getLowCTRTours: withAudit(agentId, 'getLowCTRTours', async (limit: unknown) => {
      const lim = typeof limit === 'number' ? limit : 10;
      const { rows } = await pool.query<{
        tour_id: string; title: string; views: string;
        bookings: string; ctr_pct: string;
      }>(
        `SELECT
          ot.id AS tour_id, ot.title, COUNT(pv.id)::text AS views,
          COUNT(ob.id)::text AS bookings,
          CASE WHEN COUNT(pv.id) > 0
            THEN ROUND(COUNT(ob.id)::numeric / COUNT(pv.id) * 100, 2)::text
            ELSE '0' END AS ctr_pct
        FROM operator_tours ot
        LEFT JOIN page_views pv ON pv.path = '/tours/' || ot.id::text
          AND pv.created_at >= NOW() - INTERVAL '30 days'
        LEFT JOIN operator_bookings ob ON ob.operator_tour_id = ot.id
          AND ob.deleted_at IS NULL
          AND ob.created_at >= NOW() - INTERVAL '30 days'
        WHERE ot.deleted_at IS NULL
        GROUP BY ot.id, ot.title
        HAVING COUNT(pv.id) > 5
        ORDER BY CASE WHEN COUNT(pv.id) > 0 THEN COUNT(ob.id)::numeric / COUNT(pv.id) ELSE 0 END ASC
        LIMIT $1`,
        [lim]
      );
      return { success: true, message: `${rows.length} low-CTR tours found`, details: { tours: rows } };
    }),
    recallSharedMemory: withAudit(agentId, 'recallSharedMemory', makeRecallShared()),
  };
}

function buildPlanningToolkit(agentId: string): AgentToolkit {
  return {
    getDemandSnapshot: withAudit(agentId, 'getDemandSnapshot', async () => {
      try {
        const entry = await agentMemory.get(agentId, 'demand_snapshot', 'tourist_demand_30d');
        if (entry) {
          return {
            success: true,
            message: 'Demand snapshot loaded',
            details: { demand: entry.value },
          };
        }
        // Fallback: aggregate demand signals from memory
        const signals = await agentMemory.recall(agentId, 'tourist_demand', 50);
        return {
          success: true,
          message: `${signals.length} demand signals loaded`,
          details: { signals: signals.map(s => s.value) },
        };
      } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : String(err) };
      }
    }),
    getSeasonalForecast: withAudit(agentId, 'getSeasonalForecast', async () => {
      const { rows } = await pool.query<{
        month: string; bookings: string; revenue: string;
      }>(
        `SELECT
          TO_CHAR(created_at, 'YYYY-MM') AS month,
          COUNT(*)::text AS bookings,
          COALESCE(SUM(final_price) FILTER (WHERE payment_status IN ('paid','completed')), 0)::text AS revenue
        FROM operator_bookings
        WHERE created_at >= NOW() - INTERVAL '12 months' AND deleted_at IS NULL
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month`
      );
      return { success: true, message: `${rows.length} months of data`, details: { seasonal: rows } };
    }),
    parseInterests: withAudit(agentId, 'parseInterests', async (text: unknown) => {
      const { parseInterestsFromText } = await import('@/lib/services/routes-recommender');
      const parsed = parseInterestsFromText(String(text));
      return {
        success: true,
        message: `Parsed: ${parsed.interests.join(', ')}`,
        details: { parsed },
      };
    }),
    fetchWeather: withAudit(agentId, 'fetchWeather', async (lat: unknown, lng: unknown, days: unknown) => {
      const { fetchWeatherForecast } = await import('@/lib/services/planner-intelligence');
      const forecast = await fetchWeatherForecast(
        typeof lat === 'number' ? lat : 53.0,
        typeof lng === 'number' ? lng : 158.6,
        typeof days === 'number' ? days : 7
      );
      return {
        success: true,
        message: `${forecast.length}-day forecast loaded`,
        details: { forecast },
      };
    }),
  };
}

function buildEvoToolkit(agentId: string): AgentToolkit {
  return {
    recallSharedMemory: withAudit(agentId, 'recallSharedMemory', makeRecallShared()),
    runDiagnostic: withAudit(agentId, 'runDiagnostic', makeRunDiagnostic()),
    getExperimentResults: withAudit(agentId, 'getExperimentResults', async () => {
      try {
        const experiments = await agentMemory.recall('evo', 'experiment', 20);
        return {
          success: true,
          message: `${experiments.length} experiments found`,
          details: { experiments: experiments.map(e => ({ key: e.key, value: e.value, confidence: e.confidence })) },
        };
      } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : String(err) };
      }
    }),
  };
}

function buildLegalToolkit(agentId: string): AgentToolkit {
  return {
    getAgreementStats: withAudit(agentId, 'getAgreementStats', async () => {
      const { rows } = await pool.query<{
        agreement_type: string; accepted_count: string; total_users: string; acceptance_rate: string;
      }>(
        `SELECT
          agreement_type,
          COUNT(*) FILTER (WHERE accepted_at IS NOT NULL)::text AS accepted_count,
          COUNT(*)::text AS total_users,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE accepted_at IS NOT NULL)::numeric / COUNT(*) * 100, 1)::text
            ELSE '0' END AS acceptance_rate
        FROM user_agreements
        GROUP BY agreement_type`
      );
      return {
        success: true,
        message: `${rows.length} agreement types`,
        details: { stats: rows },
      };
    }),
    emitComplianceIssue: withAudit(agentId, 'emitComplianceIssue', async (details: unknown) => {
      emitEvent('COMPLIANCE_ISSUE', agentId, 'warning', typeof details === 'object' && details !== null ? details as Record<string, unknown> : { info: String(details) });
      return { success: true, message: 'Compliance issue event emitted' };
    }),
    sendLegalAlert: withAudit(agentId, 'sendLegalAlert', makeSendAlert(agentId, 'Legal')),
  };
}

function buildVibeCoderToolkit(agentId: string): AgentToolkit {
  return {
    scanComponentPatterns: withAudit(agentId, 'scanComponentPatterns', async () => {
      const { rows } = await pool.query<{
        action_type: string; count: string; last_seen: string;
      }>(
        `SELECT action_type, COUNT(*)::text AS count, MAX(created_at)::text AS last_seen
        FROM ai_actions_log
        WHERE action_type IN ('ui_change', 'ui_copy_change', 'code_change')
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY action_type ORDER BY count DESC`
      );
      return {
        success: true,
        message: `${rows.length} UI change patterns found`,
        details: { patterns: rows },
      };
    }),
    recallSharedMemory: withAudit(agentId, 'recallSharedMemory', makeRecallShared()),
  };
}

// ── Registry ──────────────────────────────────────────────────────────────────

const TOOLKIT_BUILDERS: Record<string, (agentId: string) => AgentToolkit> = {
  rescue: buildRescueToolkit,
  security: buildSecurityToolkit,
  admin: buildAdminToolkit,
  eco: buildEcoToolkit,
  finance: buildFinanceToolkit,
  infra: buildInfraToolkit,
  hacker: buildHackerToolkit,
  quality: buildQualityToolkit,
  content: buildContentToolkit,
  planning: buildPlanningToolkit,
  evo: buildEvoToolkit,
  legal: buildLegalToolkit,
  vibe_coder: buildVibeCoderToolkit,
};

/**
 * Get toolkit for a specific agent. Returns empty object for unknown agents.
 */
export function getToolkitForAgent(agentId: string): AgentToolkit {
  const builder = TOOLKIT_BUILDERS[agentId];
  const toolkit = builder ? builder(agentId) : {};
  // All agents get brain access
  toolkit.brainSearch = withAudit(agentId, 'brainSearch', makeBrainSearch(agentId));
  toolkit.brainWrite = withAudit(agentId, 'brainWrite', makeBrainWrite(agentId));
  return toolkit;
}
