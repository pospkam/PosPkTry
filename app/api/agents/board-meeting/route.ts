/**
 * POST /api/agents/board-meeting
 *
 * SSE-стриминг, 4 раунда:
 *   Раунд 1 — каждый агент готовит отчёт (последовательно)
 *   Раунд 2 — перекрёстные реакции (AgentMesh)
 *   Раунд 3 — консенсус фасилитатора (Evolution)
 *   Раунд 4 — инициативы агентов → agent_approvals
 *
 * Memory loop:
 *   - перед стартом: читаем решения директора + evo-инсайты → context.memories
 *   - после совещания: consensus + proposals → agent_memory['evo']['insight']
 *
 * PUT /api/agents/board-meeting — зафиксировать решение директора.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { ContextHub } from '@/lib/agents/context-hub';
import type { AgentContext } from '@/lib/agents/context-hub';
import { AgentMesh } from '@/lib/agents/mesh/agent-mesh';
import type { AgentReaction } from '@/lib/agents/mesh/agent-mesh';
import { pool } from '@/lib/db-pool';
import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { approvalRequired } from '@/lib/agents/safeguards/approval-required';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';
import { externalResearcher } from '@/lib/agents/research/external-researcher';
import {
  validateProposalAgainstChecklist,
  isFactualAndHonest,
  hasTransparency,
  getSummaryOfViolations,
} from '@/lib/agents/validation/director-standards';
import { buildRichAgentContext } from '@/lib/agents/evolution/agent-context-v2';
import { runAgentsInParallel, createAgentPromptForRound } from '@/lib/agents/evolution/optimized-runner';
import { getAgentKnowledgeBase } from '@/lib/agents/evolution/agent-knowledge';

export const dynamic     = 'force-dynamic';
export const maxDuration = 300;

// ── Types ────────────────────────────────────────────────────────────────────────────

export interface AgentReport {
  id:          string;
  name:        string;
  role:        string;
  intent:      string;
  report:      string;
  duration_ms: number;
  status:      'ok' | 'error';
  has_signals?: boolean;
}

export interface AgentProposal {
  from_id:         string;
  from_name:       string;
  from_role:       string;
  action_type:     string;
  title:           string;
  description:     string;
  priority:        'high' | 'medium' | 'low';
  color:           string;
  needs_approval:  boolean;
  approval_id:     string | null;
}

// ── Agent registry ───────────────────────────────────────────────────────────────────

const MEETING_AGENTS = [
  { id: 'admin',    name: 'AI Администратор',       role: 'Операционный директор',     intent: 'admin_digest',     color: 'var(--accent)' },
  { id: 'legal',    name: 'AI Юрист',               role: 'Юрисконсульт',              intent: 'legal_risks',      color: '#8B5CF6'       },
  { id: 'security', name: 'AI Служба безопасности', role: 'Руководитель безопасности', intent: 'sec_report',       color: 'var(--danger)' },
  { id: 'hacker',   name: 'AI Хакер',               role: 'Директор по росту',         intent: 'hack_growth',      color: 'var(--success)'},
  { id: 'rescue',   name: 'AI Спасатель',           role: 'Начальник SAR',             intent: 'rescue_sos_stats', color: 'var(--warning)'},
  { id: 'eco',      name: 'AI Эколог',              role: 'Эколог-аналитик',           intent: 'eco_impact',       color: '#10B981'       },
  { id: 'content',  name: 'AI Аудитор',             role: 'Контент-директор',          intent: 'content_audit',    color: 'var(--ocean)'  },
  { id: 'quality',  name: 'AI Качество',             role: 'Директор по качеству',      intent: 'qa_operators',     color: '#F59E0B'       },
  { id: 'evo',      name: 'AI Эволюция',            role: 'Архитектор платформы',      intent: 'evo_optimize',     color: '#EC4899'       },
] as const;

// ── Proposal config per agent ───────────────────────────────────────────────────────────

interface ProposalConfig {
  persona:       string;
  allowed_types: string[];
  domain:        string;
}

/**
 * AI DIRECTORS TRAINING MANUAL integration:
 * Each agent must follow 5 core principles:
 * 1. Factual Accuracy Only
 * 2. Zero Hallucinations
 * 3. No Sycophancy
 * 4. Reality Checks
 * 5. Transparency
 */
const PROPOSAL_CONFIGS: Record<string, ProposalConfig> = {
  admin: {
    persona:       'Ты операционный директор туристической платформы Камчатки. Следи за операционными метриками: SLA операторов, конверсия бронирований, расчёты комиссий. Все решения — только с данными. Проверь ROI перед предложением.',
    allowed_types: ['booking_rule_change', 'commission_change', 'bulk_notify'],
    domain: 'operations',
  },
  legal: {
    persona:       'Ты юрисконсульт туристической платформы Камчатки. Анализируй compliance, контракты, риски. Каждое утверждение цитируй: "Статья X T&C говорит...". Если не знаешь — говори "нужна консультация специалиста".',
    allowed_types: ['booking_rule_change'],
    domain: 'legal_compliance',
  },
  security: {
    persona:       'Ты руководитель службы безопасности платформы. Анализируй РЕАЛЬНЫЕ уязвимости, не гипотетические угрозы. Каждый риск: как его эксплуатировать? На что влияет? Кто знает об этом? Если не можешь ответить — напиши "Требует расследования".',
    allowed_types: ['api_scope_expand', 'bulk_notify', 'sql_query_fix'],
    domain: 'security',
  },
  hacker: {
    persona:       'Ты директор по росту (growth hacker) туристической платформы. Предложение = А/В тест результат или метрика из базы. Покажи рост %, когда это произойдёт, какие ресурсы нужны.',
    allowed_types: ['price_change', 'ui_copy_change'],
    domain: 'growth',
  },
  rescue: {
    persona:       'Ты начальник поисково-спасательной службы (SAR) Камчатки. Анализируй РЕАЛЬНЫЕ SOS инциденты из БД, погодные данные, ответное время.',
    allowed_types: ['bulk_notify', 'schedule_suggest'],
    domain: 'emergency',
  },
  eco: {
    persona:       'Ты эколог-аналитик туристических маршрутов Камчатки. Анализируй РЕАЛЬНУЮ нагрузку на природу, не предположения. Не будь активистом, будь аналитиком.',
    allowed_types: ['schedule_suggest', 'booking_rule_change'],
    domain: 'ecology',
  },
  content: {
    persona:       'Ты контент-директор туристической платформы. Анализируй кликабельность описаний, конверсию из контента, отзывы.',
    allowed_types: ['ui_copy_change', 'prompt_optimize'],
    domain: 'content',
  },
  quality: {
    persona:       'Ты директор по качеству туристических операторов. Анализируй жалобы, рейтинги КОНКРЕТНЫЕ. Не "качество падает", а "Оператор X: 3 жалобы, рейтинг -0.5pts".',
    allowed_types: ['bulk_notify', 'tour_auto_cancel'],
    domain: 'quality',
  },
  evo: {
    persona:       'Ты архитектор AI-системы туристической платформы — следишь за её эволюцией. Интегрируй решения других директоров, проверь противоречия. Если consensus не работает вместе — флаг "CONFLICT". Показывай полный результат, не обрезай.',
    allowed_types: ['prompt_optimize', 'schedule_suggest', 'sql_query_fix'],
    domain: 'architecture',
  },
};

// ── Agent runner ───────────────────────────────────────────────────────────────────────

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

// ── Proposal generator (Round 4) ────────────────────────────────────────────────────────

async function generateProposal(
  agent:    AgentReport,
  cfg:      ProposalConfig,
  consensus: string,
  meetingId: string,
  topic?:   string | null,
): Promise<AgentProposal | null> {
  const topicLine = topic
    ? `\nТЕМА СОВЕЩАНИЯ: "${topic}"\nТвоё предложение должно быть НАПРЯМУЮ связано с этой темой.\n`
    : '';

  const promptGuardian = `
ОБЯЗАТЕЛЬНО прочитай эти правила перед ответом:
1. FACTUALITY: Каждый claim — только данные. Без "probably", "likely", "I think".
2. ZERO HALLUCINATIONS: Не изобретай метрики. Если нет данных → "данных нет".
3. NO SYCOPHANCY: Без лести. Прямо: "Метрика упала на 30%, вот почему".
4. REALITY CHECKS: Кто реализует? Когда? Что может сломаться?
5. TRANSPARENCY: Покажи работу. Отметь предположения. Напиши confidence.
Если не соблюдаешь эти правила → предложение будет отклонено.
`;

  const prompt = [
    cfg.persona,
    promptGuardian,
    topicLine,
    `На совещании (${meetingId}) ты подготовил отчёт:`,
    `"${agent.report.replace(/<[^>]+>/g, '').substring(0, 300)}..."`,
    '',
    `Итог совещания:`,
    `"${consensus.replace(/<[^>]+>/g, '').substring(0, 250)}..."`,
    '',
    'Предложи ОДНО конкретное действие для директора платформы — строго из твоей зоны компетенции.',
    'Если действий нет — ответь ровно: NULL',
    '',
    'Если есть предложение — только JSON (без markdown, без пояснений):',
    '{',
    `  "action_type": "${cfg.allowed_types.join(' | ')}",`,
    '  "title": "краткое название действия до 60 символов",',
    '  "description": "что конкретно сделать — 1-2 предложения; укажи данные, кто делает, когда",',
    '  "priority": "high | medium | low",',
    '  "confidence": "high | medium | low",',
    '  "needs_approval": true | false',
    '}',
  ].join('\n');

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const text = await callAIWaterfall(messages);

  if (!text || text.trim().toUpperCase() === 'NULL' || text.trim() === '') return null;

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: {
    action_type?: string;
    title?: string;
    description?: string;
    priority?: string;
    confidence?: string;
    needs_approval?: boolean;
  };

  try { parsed = JSON.parse(match[0]); }
  catch { return null; }

  if (!parsed.title || !parsed.description) return null;

  const actionType = cfg.allowed_types.includes(parsed.action_type ?? '')
    ? parsed.action_type!
    : cfg.allowed_types[0];

  const priority = (['high', 'medium', 'low'] as const).includes(parsed.priority as 'high' | 'medium' | 'low')
    ? parsed.priority as 'high' | 'medium' | 'low'
    : 'medium';

  const confidence = (['high', 'medium', 'low'] as const).includes(parsed.confidence as 'high' | 'medium' | 'low')
    ? parsed.confidence as 'high' | 'medium' | 'low'
    : 'medium';

  // ── VALIDATION AGAINST STANDARDS ─────────────────────────────────────────────────────────────
  const validation = validateProposalAgainstChecklist(
    {
      title: parsed.title,
      description: parsed.description,
      action_type: actionType,
      priority,
    },
    agent.id,
    agent.report
  );

  const isHonest = isFactualAndHonest(parsed.description);
  const hasTransparencyMarked = hasTransparency(parsed.description) || confidence !== 'high';

  if (!validation.valid || !isHonest || !hasTransparencyMarked) {
    const violationSummary = getSummaryOfViolations(validation);
    const honestySummary = !isHonest ? 'HONESTY: Proposal may contain unverified claims' : '';
    const transparencySummary = !hasTransparencyMarked ? 'TRANSPARENCY: Missing confidence/uncertainty markers' : '';

    const allIssues = [violationSummary, honestySummary, transparencySummary]
      .filter(s => s.length > 0)
      .join(' | ');

    try {
      await pool.query(
        `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
        [
          'agent_proposal_validation',
          JSON.stringify({
            agent_id: agent.id,
            meeting_id: meetingId,
            proposal_title: parsed.title,
            valid: validation.valid && isHonest && hasTransparencyMarked,
            violations: validation.violations,
            warnings: validation.warnings,
            honesty_check: isHonest,
            transparency_check: hasTransparencyMarked,
            confidence: confidence,
            issues_summary: allIssues,
          }),
        ]
      ).catch(() => null);
    } catch { /* non-critical */ }

    if (validation.violations.length > 0 || !isHonest) {
      return null;
    }
  }

  const approval = await approvalRequired.request({
    type:         actionType,
    description:  parsed.title.substring(0, 255),
    context: {
      from_agent:       agent.id,
      full_description: parsed.description,
      meeting_id:       meetingId,
      priority,
      confidence,
      domain:           cfg.domain,
    },
    requested_by:  `agent_${agent.id}`,
    expires_hours: 48,
  });

  const agentDef = MEETING_AGENTS.find(a => a.id === agent.id);

  return {
    from_id:        agent.id,
    from_name:      agent.name,
    from_role:      agent.role,
    action_type:    actionType,
    title:          parsed.title.substring(0, 120),
    description:    parsed.description.substring(0, 400),
    priority,
    color:          agentDef?.color ?? 'var(--accent)',
    needs_approval: approval.needs_approval,
    approval_id:    approval.id ?? null,
  };
}

// ── POST — SSE стриминг ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let topic: string | null = null;
  try {
    const body = await req.json().catch(() => ({})) as { topic?: string };
    topic = (typeof body.topic === 'string' && body.topic.trim())
      ? body.topic.trim().substring(0, 500)
      : null;
  } catch { /* topic remains null */ }

  const meetingStart = Date.now();
  const meetingId    = `mtg_${Date.now()}`;
  const startedAt    = new Date().toISOString();
  const encoder      = new TextEncoder();

  let sessionDbId: string | null = null;
  try {
    const sesRes = await pool.query<{ id: string }>(
      `INSERT INTO board_meeting_sessions (topic, initiated_by, status)
       VALUES ($1, $2, 'running') RETURNING id`,
      [topic, parseInt(authResult.userId, 10)]
    );
    sessionDbId = sesRes.rows[0]?.id ?? null;
  } catch { /* таблица может не существовать на старом проде */ }

  const send = (controller: ReadableStreamDefaultController, data: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const contextHub = new ContextHub();
        const context    = await contextHub.build(
          parseInt(authResult.userId, 10),
          'admin',
          'board-meeting'
        );

        const [directorDecisions, evoInsights] = await Promise.all([
          agentMemory.recall('director', 'decision', 3),
          agentMemory.recall('evo', 'insight', 5),
        ]);
        context.memories = [
          ...directorDecisions.map(m => ({ key: m.key, value: m.value, confidence: m.confidence })),
          ...evoInsights.map(m => ({ key: m.key, value: m.value, confidence: m.confidence })),
        ];

        if (topic) {
          context.topic = topic;
        }

        send(controller, { type: 'meeting_start', meeting_id: meetingId, started_at: startedAt, topic });
        send(controller, { type: 'signals_start' });

        const externalSignals = await externalResearcher
          .fetchSignals(MEETING_AGENTS.map(a => a.id))
          .catch(() => ({} as Record<string, string>));

        context.external_signals = externalSignals;
        const signalsCount = Object.keys(externalSignals).length;
        send(controller, { type: 'signals_done', count: signalsCount });

        const agents: AgentReport[] = [];

        for (const agentDef of MEETING_AGENTS) {
          send(controller, { type: 'agent_start', id: agentDef.id, name: agentDef.name, role: agentDef.role });

          const result = await runAgent(agentDef.intent, context);
          const failed = result.response.startsWith('Ошибка:');

          const signal   = externalSignals[agentDef.id];
          const fullReport = signal && !failed
            ? `${result.response}\n\n<b>Внешние сигналы:</b>\n${signal}`
            : result.response;

          const report: AgentReport = {
            id:          agentDef.id,
            name:        agentDef.name,
            role:        agentDef.role,
            intent:      agentDef.intent,
            report:      fullReport,
            duration_ms: result.duration_ms,
            status:      failed ? 'error' : 'ok',
            has_signals: signal ? true : false,
          };

          agents.push(report);
          send(controller, { type: 'agent_done', agent: report });
        }

        send(controller, { type: 'round2_start' });
        const mesh      = new AgentMesh();
        const reactions = await mesh.runReactions(agents);
        send(controller, { type: 'reactions_done', reactions });

        send(controller, { type: 'round3_start' });
        const consensus   = await mesh.runConsensus(agents, reactions);
        send(controller, { type: 'consensus_done', consensus });

        send(controller, { type: 'round4_start' });
        const successfulAgents = agents.filter(a => a.status === 'ok');

        for (const agent of successfulAgents) {
          const cfg = PROPOSAL_CONFIGS[agent.id];
          if (!cfg) continue;

          try {
            const proposal = await generateProposal(agent, cfg, consensus, meetingId, topic);
            if (proposal) {
              send(controller, { type: 'proposal', proposal });
            }
          } catch { /* non-critical */ }
        }

        const duration_ms = Date.now() - meetingStart;
        send(controller, {
          type:       'done',
          meeting_id: meetingId,
          started_at: startedAt,
          consensus,
          synthesis:  consensus,
          duration_ms,
        });

        const okCount = agents.filter(a => a.status === 'ok').length;
        try {
          await pool.query(
            `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
            [
              'agent_board-meeting',
              JSON.stringify({
                intent:          'board_meeting',
                decision:        meetingId,
                result:          'success',
                duration_ms,
                user_id:         parseInt(authResult.userId, 10),
                agents_count:    agents.length,
                ok:              okCount,
                reactions_count: reactions.length,
              }),
            ]
          );
          await agentMemory.remember({
            agent_id:    'evo',
            memory_type: 'insight',
            key:         `meeting_${meetingId}`,
            value: {
              topic:           topic ?? null,
              consensus:       consensus.substring(0, 2000),
              agents_ok:       okCount,
              reactions_count: reactions.length,
              duration_ms,
            },
            source:      'board_meeting',
            expires_at:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });

          if (sessionDbId) {
            await pool.query(
              `UPDATE board_meeting_sessions
               SET status='completed', completed_at=NOW(), consensus=$2
               WHERE id=$1`,
              [sessionDbId, consensus.substring(0, 2000)]
            ).catch(() => null);
          }
        } catch { /* non-critical */ }

      } catch (err) {
        send(controller, { type: 'error', message: err instanceof Error ? err.message : 'Неизвестная ошибка' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ── PUT: зафиксировать решение директора ──────────────────────────────────────────────────

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
    `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
    [
      'agent_board-meeting',
      JSON.stringify({
        intent:        'board_meeting_decision',
        decision:      meeting_id,
        result:        'success',
        duration_ms:   0,
        user_id:       parseInt(authResult.userId, 10),
        decision_text: decision.substring(0, 2000),
      }),
    ]
  );

  await agentMemory.remember({
    agent_id:    'director',
    memory_type: 'decision',
    key:         meeting_id,
    value: {
      decision:   decision.substring(0, 2000),
      meeting_id,
      decided_at: new Date().toISOString(),
    },
    source:     'board_meeting',
    confidence: 1.0,
  });

  return NextResponse.json({ success: true });
}
