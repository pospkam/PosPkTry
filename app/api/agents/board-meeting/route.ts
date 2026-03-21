/**
 * POST /api/agents/board-meeting
 *
 * Трёхраундовое совещание директора с межагентным взаимодействием:
 *   Раунд 1 — каждый агент независимо готовит отчёт (параллельно)
 *   Раунд 2 — каждый агент читает чужие отчёты и реагирует (параллельно)
 *   Раунд 3 — Evolution фасилитирует консенсус и конфликты (AI-синтез)
 *
 * Требует роль admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { ContextHub } from '@/lib/agents/context-hub';
import type { AgentContext } from '@/lib/agents/context-hub';
import { AgentMesh } from '@/lib/agents/mesh/agent-mesh';
import type { AgentReaction } from '@/lib/agents/mesh/agent-mesh';
import { pool } from '@/lib/db-pool';
import { agentMemory } from '@/lib/agents/memory/agent-memory';

export const dynamic     = 'force-dynamic';
export const maxDuration = 90;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentReport {
  id:          string;
  name:        string;
  role:        string;
  intent:      string;
  report:      string;
  duration_ms: number;
  status:      'ok' | 'error';
}

export interface BoardMeetingResult {
  meeting_id:  string;
  started_at:  string;
  agents:      AgentReport[];
  reactions:   AgentReaction[];
  consensus:   string;
  /** @deprecated kept for backwards compat with old client */
  synthesis:   string;
  duration_ms: number;
}

// ── Agent registry ────────────────────────────────────────────────────────────

const MEETING_AGENTS = [
  { id: 'admin',    name: 'AI Администратор',       role: 'Операционный директор',   intent: 'admin_digest'     },
  { id: 'legal',    name: 'AI Юрист',               role: 'Юрисконсульт',            intent: 'legal_risks'      },
  { id: 'security', name: 'AI Служба безопасности', role: 'Руководитель безопасности', intent: 'sec_report'     },
  { id: 'hacker',   name: 'AI Хакер',               role: 'Директор по росту',       intent: 'hack_growth'      },
  { id: 'rescue',   name: 'AI Спасатель',           role: 'Начальник SAR',           intent: 'rescue_sos_stats' },
  { id: 'eco',      name: 'AI Эколог',              role: 'Эколог-аналитик',         intent: 'eco_impact'       },
  { id: 'content',  name: 'AI Аудитор',             role: 'Контент-директор',        intent: 'content_audit'    },
  { id: 'quality',  name: 'AI Качество',            role: 'Директор по качеству',    intent: 'qa_operators'     },
  { id: 'evo',      name: 'AI Эволюция',            role: 'Архитектор платформы',    intent: 'evo_optimize'     },
] as const;

// ── Agent runner ──────────────────────────────────────────────────────────────

async function runAgent(
  intent: string,
  context: AgentContext
): Promise<{ response: string; duration_ms: number }> {
  const start = Date.now();
  try {
    switch (intent) {
      case 'admin_digest': {
        const { AdminAgency } = await import('@/lib/agents/agencies/admin-agency');
        const r = await new AdminAgency().run(intent, context);
        return { response: r.response, duration_ms: Date.now() - start };
      }
      case 'legal_risks': {
        const { LegalAgency } = await import('@/lib/agents/agencies/legal-agency');
        const r = await new LegalAgency().run(intent, context);
        return { response: r.response, duration_ms: Date.now() - start };
      }
      case 'sec_report': {
        const { SecurityAgency } = await import('@/lib/agents/agencies/security-agency');
        const r = await new SecurityAgency().run(intent, context);
        return { response: r.response, duration_ms: Date.now() - start };
      }
      case 'hack_growth': {
        const { HackerAgency } = await import('@/lib/agents/agencies/hacker-agency');
        const r = await new HackerAgency().run(intent, context);
        return { response: r.response, duration_ms: Date.now() - start };
      }
      case 'rescue_sos_stats': {
        const { RescueAgency } = await import('@/lib/agents/agencies/rescue-agency');
        const r = await new RescueAgency().run(intent, context);
        return { response: r.response, duration_ms: Date.now() - start };
      }
      case 'eco_impact': {
        const { EcoAgency } = await import('@/lib/agents/agencies/eco-agency');
        const r = await new EcoAgency().run(intent, context);
        return { response: r.response, duration_ms: Date.now() - start };
      }
      case 'content_audit': {
        const { ContentAuditorAgency } = await import('@/lib/agents/agencies/content-auditor-agency');
        const r = await new ContentAuditorAgency().run(intent, context);
        return { response: r.response, duration_ms: Date.now() - start };
      }
      case 'qa_operators': {
        const { QualityAgency } = await import('@/lib/agents/agencies/quality-agency');
        const r = await new QualityAgency().run(intent, context);
        return { response: r.response, duration_ms: Date.now() - start };
      }
      case 'evo_optimize': {
        const { EvolutionAgency } = await import('@/lib/agents/agencies/evolution-agency');
        const r = await new EvolutionAgency().run(intent, context);
        return { response: r.response, duration_ms: Date.now() - start };
      }
      default:
        return { response: 'Агент не найден.', duration_ms: Date.now() - start };
    }
  } catch (err) {
    return {
      response:    `Ошибка: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - start,
    };
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const meetingStart = Date.now();
  const meetingId    = `mtg_${Date.now()}`;
  const startedAt    = new Date().toISOString();

  // Строим контекст один раз — используют все агенты
  const contextHub = new ContextHub();
  const context    = await contextHub.build(
    parseInt(authResult.userId, 10),
    'admin',
    'board-meeting'
  );

  // ── Раунд 1: параллельные отчёты ────────────────────────────────────────────
  const round1 = await Promise.allSettled(
    MEETING_AGENTS.map(async (agent): Promise<AgentReport> => {
      const result = await runAgent(agent.intent, context);
      const failed = result.response.startsWith('Ошибка:');
      return {
        id:          agent.id,
        name:        agent.name,
        role:        agent.role,
        intent:      agent.intent,
        report:      result.response,
        duration_ms: result.duration_ms,
        status:      failed ? 'error' : 'ok',
      };
    })
  );

  const agents: AgentReport[] = round1.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          id:          MEETING_AGENTS[i].id,
          name:        MEETING_AGENTS[i].name,
          role:        MEETING_AGENTS[i].role,
          intent:      MEETING_AGENTS[i].intent,
          report:      'Агент не ответил.',
          duration_ms: 0,
          status:      'error' as const,
        }
  );

  // ── Раунд 2: межагентные реакции ─────────────────────────────────────────────
  const mesh      = new AgentMesh();
  const reactions = await mesh.runReactions(agents);

  // ── Раунд 3: консенсус фасилитатора ──────────────────────────────────────────
  const consensus = await mesh.runConsensus(agents, reactions);

  // ── Логируем ─────────────────────────────────────────────────────────────────
  const okCount = agents.filter(a => a.status === 'ok').length;
  try {
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata)
       VALUES ($1, $2)`,
      [
        'agent_board-meeting',
        JSON.stringify({
          intent: 'board_meeting',
          decision: meetingId,
          result: 'success',
          duration_ms: Date.now() - meetingStart,
          user_id: parseInt(authResult.userId, 10),
          agents_count: agents.length,
          ok: okCount,
          reactions_count: reactions.length,
        }),
      ]
    );
    // Store consensus as shared memory
    await agentMemory.remember({
      agent_id: 'evo',
      memory_type: 'insight',
      key: `meeting_${meetingId}`,
      value: {
        consensus: consensus.substring(0, 2000),
        agents_ok: okCount,
        reactions_count: reactions.length,
        duration_ms: Date.now() - meetingStart,
      },
      source: 'board_meeting',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  } catch { /* non-critical */ }

  const result: BoardMeetingResult = {
    meeting_id:  meetingId,
    started_at:  startedAt,
    agents,
    reactions,
    consensus,
    synthesis:   consensus,   // backwards compat
    duration_ms: Date.now() - meetingStart,
  };

  return NextResponse.json({ success: true, ...result });
}

// ── PUT: сохранить решение директора ─────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const { meeting_id, decision } = body as { meeting_id?: string; decision?: string };
  if (!meeting_id || !decision || typeof decision !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Нужны meeting_id и decision' },
      { status: 400 }
    );
  }

  await pool.query(
    `INSERT INTO ai_actions_log (action_type, metadata)
     VALUES ($1, $2)`,
    [
      'agent_board-meeting',
      JSON.stringify({
        intent: 'board_meeting_decision',
        decision: meeting_id,
        result: 'success',
        duration_ms: 0,
        user_id: parseInt(authResult.userId, 10),
        decision_text: decision.substring(0, 2000),
      }),
    ]
  );

  // Store director's decision as shared memory
  await agentMemory.remember({
    agent_id: 'director',
    memory_type: 'decision',
    key: meeting_id,
    value: { decision: decision.substring(0, 2000), meeting_id },
    source: 'board_meeting',
  });

  return NextResponse.json({ success: true });
}
