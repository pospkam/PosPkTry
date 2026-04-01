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
import { callAIWaterfall, callAIFast } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';
import { getModelForAgent, getModelDisplayName, CONSENSUS_MODEL } from '@/lib/ai/agent-models';
import { externalResearcher } from '@/lib/agents/research/external-researcher';
import {
  runExternalObservers,
  summarizeReportsForObservers,
  buildMetricsForObservers,
  hasObserverKeys,
} from '@/lib/agents/observers/external-observers';
import type { ObserverReport } from '@/lib/agents/observers/external-observers';
import {
  validateProposalAgainstChecklist,
  isFactualAndHonest,
  hasTransparency,
  getSummaryOfViolations,
} from '@/lib/agents/validation/director-standards';
import { buildRichAgentContext } from '@/lib/agents/evolution/agent-context-v2';

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
  model_used?: string;
}

export interface AgentVote {
  agent_id:   string;
  agent_name: string;
  agent_role: string;
  color:      string;
  verdict:    'support' | 'oppose' | 'neutral';
  confidence: number; // 0-100
  reason:     string; // 1 sentence
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
  /** Назначенный исполнитель — определяется матрицей компетенций */
  executor_id:     string;
  executor_name:   string;
  executor_color:  string;
  executor_reason: string;
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
  { id: 'evo',       name: 'AI Эволюция',      role: 'Архитектор платформы',         intent: 'evo_optimize',   color: '#EC4899' },
  { id: 'finance',   name: 'AI Финдиректор',  role: 'CFO / Финансовый директор',     intent: 'finance_report', color: '#6366F1' },
  { id: 'infra',     name: 'AI DevOps',       role: 'SRE / Инфраструктура',          intent: 'infra_health',   color: '#14B8A6' },
  { id: 'vibe_coder', name: 'AI Разработчик', role: 'Vibe Coder / Самомодификация',  intent: 'code_analysis',  color: '#F97316' },
  { id: 'planning',   name: 'AI Плановик',  role: 'Стратегический плановик',        intent: 'plan_forecast',  color: '#3B82F6' },
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
  finance: {
    persona:       'Ты CFO туристической платформы. Анализируй только реальные цифры из БД: выручка, комиссии, средний чек, возвраты. Каждый claim = конкретная цифра. Без "вероятно прибыльно" — только "выручка 47 000 руб за неделю".',
    allowed_types: ['commission_change', 'booking_rule_change'],
    domain: 'finance',
  },
  infra: {
    persona:       'Ты SRE/DevOps инженер туристической платформы. Мониторишь здоровье системы: время ответа БД, ошибки AI-агентов, статус cron-задач. Каждая аномалия — с числами. Без гипотетических угроз.',
    allowed_types: ['sql_query_fix', 'schedule_suggest'],
    domain: 'infrastructure',
  },
  vibe_coder: {
    persona:       'Ты senior TypeScript разработчик этой платформы. Анализируй реальный код и данные об ошибках. Предлагай ОДНО изменение с файлом, строками и обоснованием из данных. Не рефакторь ради рефакторинга.',
    allowed_types: ['code_change', 'sql_query_fix'],
    domain: 'codebase',
  },
};

// ── Матрица компетенций: action_type → лучший исполнитель ───────────────────────────────
//
// Правило: исполнителем назначается агент с наилучшей доменной экспертизой для данного
// типа действия — независимо от того, кто его предложил.
// Нельзя назначить юриста хакером, эколога — операционным директором и т.д.

interface ExecutorEntry {
  id:     string;
  name:   string;
  color:  string;
  reason: string; // Почему именно этот агент
}

const EXECUTOR_SKILL_MAP: Record<string, ExecutorEntry> = {
  booking_rule_change: {
    id: 'admin', name: 'AI Администратор', color: 'var(--accent)',
    reason: 'Правила бронирования — операционная зона администратора',
  },
  commission_change: {
    id: 'admin', name: 'AI Администратор', color: 'var(--accent)',
    reason: 'Финансовые параметры платформы — исключительная зона операций',
  },
  bulk_notify: {
    id: 'admin', name: 'AI Администратор', color: 'var(--accent)',
    reason: 'Массовые коммуникации — координация администратора',
  },
  price_change: {
    id: 'hacker', name: 'AI Хакер', color: 'var(--success)',
    reason: 'Ценовая стратегия и A/B-тесты — зона директора по росту',
  },
  ui_copy_change: {
    id: 'content', name: 'AI Аудитор', color: 'var(--ocean)',
    reason: 'Текст интерфейса и копирайтинг — зона контент-директора',
  },
  prompt_optimize: {
    id: 'evo', name: 'AI Эволюция', color: '#EC4899',
    reason: 'Оптимизация AI-промптов — зона архитектора платформы',
  },
  api_scope_expand: {
    id: 'security', name: 'AI Служба безопасности', color: 'var(--danger)',
    reason: 'Расширение прав доступа — исключительная зона безопасности',
  },
  schedule_suggest: {
    id: 'rescue', name: 'AI Спасатель', color: 'var(--warning)',
    reason: 'Расписание маршрутов и SAR-операций — зона начальника SAR',
  },
  tour_auto_cancel: {
    id: 'quality', name: 'AI Качество', color: '#F59E0B',
    reason: 'Отмена туров по качеству — зона директора по качеству',
  },
  sql_query_fix: {
    id: 'evo', name: 'AI Эволюция', color: '#EC4899',
    reason: 'Архитектурные изменения БД — зона архитектора платформы',
  },
  code_change: {
    id: 'vibe_coder', name: 'AI Разработчик', color: '#F97316',
    reason: 'Изменения кода — зона Vibe Coder разработчика',
  },
};

// ── Agent runner ───────────────────────────────────────────────────────────────────────

/** Intent → Agency class loader */
const AGENCY_LOADERS: Record<string, () => Promise<{ run(intent: string, ctx: AgentContext): Promise<{ response: string }> }>> = {
  admin_digest:    async () => { const { AdminAgency } = await import('@/lib/agents/agencies/admin-agency'); return new AdminAgency(); },
  legal_risks:     async () => { const { LegalAgency } = await import('@/lib/agents/agencies/legal-agency'); return new LegalAgency(); },
  sec_report:      async () => { const { SecurityAgency } = await import('@/lib/agents/agencies/security-agency'); return new SecurityAgency(); },
  hack_growth:     async () => { const { HackerAgency } = await import('@/lib/agents/agencies/hacker-agency'); return new HackerAgency(); },
  rescue_sos_stats: async () => { const { RescueAgency } = await import('@/lib/agents/agencies/rescue-agency'); return new RescueAgency(); },
  eco_impact:      async () => { const { EcoAgency } = await import('@/lib/agents/agencies/eco-agency'); return new EcoAgency(); },
  content_audit:   async () => { const { ContentAuditorAgency } = await import('@/lib/agents/agencies/content-auditor-agency'); return new ContentAuditorAgency(); },
  qa_operators:    async () => { const { QualityAgency } = await import('@/lib/agents/agencies/quality-agency'); return new QualityAgency(); },
  evo_optimize:    async () => { const { EvolutionAgency } = await import('@/lib/agents/agencies/evolution-agency'); return new EvolutionAgency(); },
  finance_report:  async () => { const { FinanceAgency } = await import('@/lib/agents/agencies/finance-agency'); return new FinanceAgency(); },
  infra_health:    async () => { const { InfraAgency } = await import('@/lib/agents/agencies/infra-agency'); return new InfraAgency(); },
  code_analysis:   async () => { const { VibeCoderAgency } = await import('@/lib/agents/agencies/vibe-coder-agency'); return new VibeCoderAgency(); },
  plan_forecast:   async () => { const { PlanningAgency } = await import('@/lib/agents/agencies/planning-agency'); return new PlanningAgency(); },
};

async function runAgent(
  intent: string,
  context: AgentContext
): Promise<{ response: string; duration_ms: number }> {
  const start = Date.now();
  try {
    const loader = AGENCY_LOADERS[intent];
    if (!loader) {
      return { response: 'Агент не найден.', duration_ms: Date.now() - start };
    }
    const agency = await loader();
    const r = await agency.run(intent, context);
    return { response: r.response, duration_ms: Date.now() - start };
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
  // Round 4 proposals: structured JSON — fast/cheap model is sufficient
  const text = await callAIFast(messages);

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

  // Назначаем исполнителя по матрице компетенций
  // Если тип действия не в матрице — исполнитель = агент-инициатор
  const executorEntry = EXECUTOR_SKILL_MAP[actionType] ?? {
    id:     agent.id,
    name:   agent.name,
    color:  agentDef?.color ?? 'var(--accent)',
    reason: `Инициатор ${agent.name} — единственный компетентный исполнитель`,
  };

  // Обновляем agent_approvals: выставляем executor и execution_status=assigned
  if (approval.id) {
    await pool.query(
      `UPDATE agent_approvals
       SET executor_agent_id = $2,
           executor_name     = $3,
           execution_status  = 'assigned'
       WHERE id = $1`,
      [approval.id, executorEntry.id, executorEntry.name]
    ).catch(() => null);
  }

  return {
    from_id:         agent.id,
    from_name:       agent.name,
    from_role:       agent.role,
    action_type:     actionType,
    title:           parsed.title.substring(0, 120),
    description:     parsed.description.substring(0, 400),
    priority,
    color:           agentDef?.color ?? 'var(--accent)',
    needs_approval:  approval.needs_approval,
    approval_id:     approval.id ?? null,
    executor_id:     executorEntry.id,
    executor_name:   executorEntry.name,
    executor_color:  executorEntry.color,
    executor_reason: executorEntry.reason,
  };
}

// ── Vote extractor (only when topic is set) ─────────────────────────────────────────────

async function extractVote(
  agent:  AgentReport,
  topic:  string,
): Promise<AgentVote | null> {
  const agentDef = MEETING_AGENTS.find(a => a.id === agent.id);
  const snippet  = agent.report.replace(/<[^>]+>/g, '').substring(0, 400);

  const prompt = `Ты ${agent.name} (${agent.role}).
Тема на голосование: "${topic}"
Твой отчёт (фрагмент): "${snippet}"

Ответь строго JSON (без markdown, без пояснений):
{"verdict":"support"|"oppose"|"neutral","confidence":0-100,"reason":"одно предложение на русском"}

Правила:
- support = однозначно поддерживаю тему/инициативу
- oppose = против, вижу риски или нецелесообразность
- neutral = воздерживаюсь, недостаточно данных
- confidence = твоя уверенность в своей позиции (0-100)
- reason = конкретное обоснование в 1 предложении, без воды`;

  // Voting is binary JSON — fast/cheap model handles it perfectly
  const text = await callAIFast([{ role: 'user', content: prompt }]).catch(() => null);
  if (!text) return null;

  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;

  let parsed: { verdict?: string; confidence?: number; reason?: string };
  try { parsed = JSON.parse(match[0]); } catch { return null; }

  const verdicts = ['support', 'oppose', 'neutral'] as const;
  const verdict  = verdicts.includes(parsed.verdict as typeof verdicts[number])
    ? parsed.verdict as typeof verdicts[number]
    : 'neutral';
  const confidence = typeof parsed.confidence === 'number'
    ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
    : 50;
  const reason = typeof parsed.reason === 'string' ? parsed.reason.substring(0, 150) : '';

  return {
    agent_id:   agent.id,
    agent_name: agent.name,
    agent_role: agent.role,
    color:      agentDef?.color ?? 'var(--accent)',
    verdict,
    confidence,
    reason,
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

        const [directorDecisions, evoInsights, intelSignals] = await Promise.all([
          agentMemory.recall('director', 'decision', 3),
          agentMemory.recall('evo', 'insight', 5),
          agentMemory.recall('evo', 'intelligence', 8),
        ]);
        context.memories = [
          ...directorDecisions.map(m => ({ key: m.key, value: m.value, confidence: m.confidence })),
          ...evoInsights.map(m => ({ key: m.key, value: m.value, confidence: m.confidence })),
          ...intelSignals.map(m => ({ key: m.key, value: m.value, confidence: m.confidence })),
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

        // Build rich contexts for all agents in parallel (metrics, history, briefing)
        const richContexts = await Promise.allSettled(
          MEETING_AGENTS.map(a => buildRichAgentContext(a.id, meetingId).catch(() => null))
        );
        const richContextMap = new Map<string, Awaited<ReturnType<typeof buildRichAgentContext>> | null>();
        MEETING_AGENTS.forEach((a, i) => {
          const r = richContexts[i];
          richContextMap.set(a.id, r.status === 'fulfilled' ? r.value : null);
        });

        // Notify UI that all agents are starting
        for (const agentDef of MEETING_AGENTS) {
          send(controller, { type: 'agent_start', id: agentDef.id, name: agentDef.name, role: agentDef.role });
        }

        // Run ALL agents in parallel (instead of sequential)
        const agentResults = await Promise.allSettled(
          MEETING_AGENTS.map(async (agentDef) => {
            const richCtx = richContextMap.get(agentDef.id);
            // Clone base context and inject rich briefing
            const agentContext = { ...context };
            if (richCtx) {
              const { formatContextForPrompt } = await import('@/lib/agents/evolution/agent-context-v2');
              agentContext.richBriefing = formatContextForPrompt(richCtx);
            }
            // Inject per-agent toolkit
            const { getToolkitForAgent } = await import('@/lib/agents/tools/agent-toolkits');
            agentContext.tools = getToolkitForAgent(agentDef.id);
            // Inject per-agent AI model
            agentContext.preferredModel = getModelForAgent(agentDef.id);
            return { agentDef, result: await runAgent(agentDef.intent, agentContext) };
          })
        );

        const agents: AgentReport[] = [];
        for (let i = 0; i < MEETING_AGENTS.length; i++) {
          const agentDef = MEETING_AGENTS[i];
          const settled = agentResults[i];

          let response: string;
          let durationMs: number;

          if (settled.status === 'fulfilled') {
            response = settled.value.result.response;
            durationMs = settled.value.result.duration_ms;
          } else {
            response = `Ошибка: ${settled.reason instanceof Error ? settled.reason.message : String(settled.reason)}`;
            durationMs = 0;
          }

          const failed = response.startsWith('Ошибка:');
          const signal = externalSignals[agentDef.id];
          const fullReport = signal && !failed
            ? `${response}\n\n<b>Внешние сигналы:</b>\n${signal}`
            : response;

          const agentModel = getModelForAgent(agentDef.id);
          const report: AgentReport = {
            id:          agentDef.id,
            name:        agentDef.name,
            role:        agentDef.role,
            intent:      agentDef.intent,
            report:      fullReport,
            duration_ms: durationMs,
            status:      failed ? 'error' : 'ok',
            has_signals: signal ? true : false,
            model_used:  agentModel ? getModelDisplayName(agentModel) : undefined,
          };

          agents.push(report);
          send(controller, { type: 'agent_done', agent: report });
        }

        // ── Vote extraction (only when topic is set) ────────────────────────────
        if (topic) {
          const voteResults = await Promise.allSettled(
            agents
              .filter(a => a.status === 'ok')
              .map(a => extractVote(a, topic).catch(() => null))
          );
          const votes: AgentVote[] = voteResults
            .map(r => r.status === 'fulfilled' ? r.value : null)
            .filter((v): v is AgentVote => v !== null);
          if (votes.length > 0) {
            send(controller, { type: 'votes_done', votes });
          }
        }

        send(controller, { type: 'round2_start' });

        // ── Observer Round: external AI observers (Grok + Gemini) ─────────
        let observerReports: ObserverReport[] = [];
        if (hasObserverKeys()) {
          send(controller, { type: 'observers_start' });
          const reportsSummary = summarizeReportsForObservers(agents);
          const metrics = buildMetricsForObservers(context as unknown as Record<string, unknown>);
          observerReports = await runExternalObservers(reportsSummary, metrics);
          for (const obs of observerReports) {
            send(controller, { type: 'observer_done', observer: obs });
          }
          send(controller, { type: 'observers_done', count: observerReports.length });
        }

        const mesh      = new AgentMesh();
        // Build per-agent model map for mesh reactions
        const agentModelMap: Record<string, string> = {};
        for (const a of MEETING_AGENTS) {
          const m = getModelForAgent(a.id);
          if (m) agentModelMap[a.id] = m;
        }
        const reactions = await mesh.runReactions(agents, agentModelMap);
        send(controller, { type: 'reactions_done', reactions });

        send(controller, { type: 'round3_start' });

        // Inject observer insights into consensus if available
        let observerInsights = '';
        const okObservers = observerReports.filter(o => o.status === 'ok');
        if (okObservers.length > 0) {
          observerInsights = '\n\nВНЕШНИЕ НАБЛЮДАТЕЛИ (независимые AI, не часть команды):\n' +
            okObservers.map(o => `[${o.name}]: ${o.report.substring(0, 500)}`).join('\n');
        }

        const consensus   = await mesh.runConsensus(agents, reactions, observerInsights, CONSENSUS_MODEL);
        send(controller, { type: 'consensus_done', consensus });

        send(controller, { type: 'round4_start' });
        const successfulAgents = agents.filter(a => a.status === 'ok');

        // Run all proposals in parallel (instead of sequential)
        const proposalResults = await Promise.allSettled(
          successfulAgents
            .filter(a => !!PROPOSAL_CONFIGS[a.id])
            .map(async (agent) => {
              const cfg = PROPOSAL_CONFIGS[agent.id];
              return generateProposal(agent, cfg, consensus, meetingId, topic);
            })
        );
        for (const res of proposalResults) {
          if (res.status === 'fulfilled' && res.value) {
            send(controller, { type: 'proposal', proposal: res.value });
          }
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
                observers_count: observerReports.length,
                observers_ok:    observerReports.filter(o => o.status === 'ok').length,
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
