'use client';

import { useState, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Shield, Scale, Lock, TrendingUp, Binoculars, Leaf, FileSearch, Star,
  Cpu, PlayCircle, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp,
  Download, Loader2, Users, MessageSquare, GitMerge, TriangleAlert, ThumbsUp,
  HelpCircle, Swords, ThumbsDown, Lightbulb, Check, X, Zap, Globe, CalendarDays,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReactionTone = 'alert' | 'support' | 'conflict' | 'question';

interface AgentReaction {
  from_id: string; from_name: string; from_role: string;
  content: string; tone: ReactionTone; color: string; duration_ms: number;
}

interface AgentReport {
  id: string; name: string; role: string; intent: string;
  report: string; duration_ms: number; status: 'ok' | 'error';
  has_signals?: boolean;
}

interface AgentProposal {
  from_id: string; from_name: string; from_role: string;
  action_type: string; title: string; description: string;
  priority: 'high' | 'medium' | 'low';
  color: string; needs_approval: boolean; approval_id: string | null;
}

type StreamEvent =
  | { type: 'meeting_start';  meeting_id: string; started_at: string }
  | { type: 'signals_start' }
  | { type: 'signals_done';   count: number }
  | { type: 'agent_start';    id: string; name: string; role: string }
  | { type: 'agent_done';     agent: AgentReport }
  | { type: 'round2_start' }
  | { type: 'reactions_done'; reactions: AgentReaction[] }
  | { type: 'round3_start' }
  | { type: 'consensus_done'; consensus: string }
  | { type: 'round4_start' }
  | { type: 'proposal';       proposal: AgentProposal }
  | { type: 'done';           meeting_id: string; started_at: string; consensus: string; duration_ms: number }
  | { type: 'error';          message: string };

// ── Config ────────────────────────────────────────────────────────────────────

const AGENT_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  admin:    { icon: Shield,     color: 'var(--accent)',  label: 'Администратор' },
  legal:    { icon: Scale,      color: '#8B5CF6',        label: 'Юрист'         },
  security: { icon: Lock,       color: 'var(--danger)',  label: 'Безопасность'  },
  hacker:   { icon: TrendingUp, color: 'var(--success)', label: 'Хакер'         },
  rescue:   { icon: Binoculars, color: 'var(--warning)', label: 'Спасатель'     },
  eco:      { icon: Leaf,       color: '#10B981',        label: 'Эколог'        },
  content:  { icon: FileSearch, color: 'var(--ocean)',   label: 'Аудитор'       },
  quality:  { icon: Star,       color: '#F59E0B',        label: 'Качество'      },
  planning: { icon: CalendarDays, color: '#6366F1',      label: 'Планировщик'   },
  evo:      { icon: Cpu,        color: '#EC4899',        label: 'Эволюция'      },
};

const TONE_CONFIG: Record<ReactionTone, { icon: LucideIcon; label: string; color: string }> = {
  alert:    { icon: TriangleAlert, label: 'Предупреждение', color: 'var(--danger)'  },
  support:  { icon: ThumbsUp,      label: 'Поддерживаю',   color: 'var(--success)' },
  conflict: { icon: Swords,        label: 'Конфликт',      color: '#F59E0B'        },
  question: { icon: HelpCircle,    label: 'Вопрос',        color: 'var(--ocean)'   },
};

const PRIORITY_CONFIG = {
  high:   { label: 'Срочно',   color: 'var(--danger)'  },
  medium: { label: 'Важно',    color: 'var(--warning)' },
  low:    { label: 'Плановое', color: 'var(--ocean)'   },
} as const;

const ACTION_TYPE_LABELS: Record<string, string> = {
  booking_rule_change: 'Правила бронирования',
  commission_change:   'Комиссия',
  bulk_notify:         'Уведомление',
  price_change:        'Изменение цены',
  ui_copy_change:      'Текст интерфейса',
  prompt_optimize:     'Оптимизация AI',
  api_scope_expand:    'Расширение прав',
  schedule_suggest:    'Расписание',
  tour_auto_cancel:    'Отмена туров',
};

const STAGES = [
  { label: 'Раунд 1', hint: 'Отчёты'     },
  { label: 'Раунд 2', hint: 'Реакции'    },
  { label: 'Раунд 3', hint: 'Консенсус'  },
  { label: 'Раунд 4', hint: 'Инициативы' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function inflect(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

function renderFormattedText(raw: string) {
  const text = raw.replace(/<b>(.*?)<\/b>/g, '**$1**').replace(/<[^>]+>/g, '');
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    if (t.startsWith('**') && t.endsWith('**')) {
      return <div key={i} className="font-bold text-[var(--text-primary)] mt-3 mb-1 text-sm">{t.slice(2, -2)}</div>;
    }
    if (t.startsWith('•') || t.startsWith('-') || /^\d+\./.test(t)) {
      return (
        <div key={i} className="flex gap-2 text-sm text-[var(--text-secondary)] ml-2">
          <span className="text-[var(--accent)] mt-0.5 shrink-0">•</span>
          <span>{t.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '')}</span>
        </div>
      );
    }
    return <div key={i} className="text-sm text-[var(--text-secondary)]">{t}</div>;
  });
}

function SectionHeader({ num, label, sub }: { num: number; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-bold flex items-center justify-center shrink-0">
        {num}
      </span>
      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">{label}</span>
      {sub && <span className="text-xs text-[var(--text-muted)]">{sub}</span>}
    </div>
  );
}

function StagePills({ stage }: { stage: number }) {
  return (
    <div className="flex gap-1.5 justify-center mt-4 flex-wrap">
      {STAGES.map((s, i) => (
        <div key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all"
          style={{
            background: i === stage ? 'var(--accent)'    : 'var(--bg-hover)',
            color:      i === stage ? 'var(--bg-primary)' : 'var(--text-muted)',
            fontWeight: i === stage ? '700' : '400',
          }}>
          {i < stage   ? <CheckCircle size={10} /> :
           i === stage ? <Loader2 size={10} className="animate-spin" /> :
                         <span className="w-2 h-2 rounded-full bg-current opacity-30 inline-block" />}
          {s.label}: {s.hint}
        </div>
      ))}
    </div>
  );
}

// ── AgentCard ─────────────────────────────────────────────────────────────────

function AgentCard({
  agent, pending, onFeedback,
}: {
  agent?:     AgentReport;
  pending?:   { id: string; name: string; role: string };
  onFeedback: (intent: string, rating: 'good' | 'bad') => void;
}) {
  const [expanded,     setExpanded]     = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<'good' | 'bad' | null>(null);

  const id  = agent?.id ?? pending?.id ?? '';
  const cfg = AGENT_CONFIG[id] ?? { icon: Shield, color: 'var(--accent)', label: agent?.name ?? pending?.name ?? '' };
  const Icon = cfg.icon;

  if (!agent && pending) {
    return (
      <div className="ds-card overflow-hidden opacity-75">
        <div className="flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
            <Icon size={16} style={{ color: cfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[var(--text-primary)] text-sm">{pending.name}</div>
            <div className="text-xs text-[var(--text-muted)]">{pending.role}</div>
          </div>
          <Loader2 size={13} className="animate-spin shrink-0" style={{ color: cfg.color }} />
          <span className="text-xs text-[var(--text-muted)]">работает...</span>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="ds-card overflow-hidden">
      <button type="button" onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[var(--bg-hover)] transition-colors">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}>
          <Icon size={16} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="font-bold text-[var(--text-primary)] text-sm">{agent.name}</div>
          <div className="text-xs text-[var(--text-muted)] truncate">{agent.role}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {agent.status === 'ok'
            ? <span className="flex items-center gap-1 text-xs text-[var(--success)] font-medium"><CheckCircle size={12} />Готов</span>
            : <span className="flex items-center gap-1 text-xs text-[var(--danger)] font-medium"><AlertCircle size={12} />Ошибка</span>}
          {agent.has_signals && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--ocean)15', color: 'var(--ocean)', border: '1px solid var(--ocean)30' }}>
              <Globe size={9} />Внешний сигнал
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)]">{(agent.duration_ms / 1000).toFixed(1)}с</span>
          {expanded ? <ChevronUp size={13} className="text-[var(--text-muted)]" /> : <ChevronDown size={13} className="text-[var(--text-muted)]" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3">
          <div className="space-y-0.5 mb-3">{renderFormattedText(agent.report)}</div>
          {agent.status === 'ok' && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--text-muted)]">Отчёт полезен?</span>
              {feedbackSent ? (
                <span className="text-xs text-[var(--success)] flex items-center gap-1">
                  <CheckCircle size={11} />{feedbackSent === 'good' ? 'Полезно' : 'Отмечено'}
                </span>
              ) : (
                <>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); setFeedbackSent('good'); onFeedback(agent.intent, 'good'); }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-[var(--bg-hover)] transition-colors"
                    style={{ color: 'var(--success)' }}>
                    <ThumbsUp size={11} />Да
                  </button>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); setFeedbackSent('bad'); onFeedback(agent.intent, 'bad'); }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-[var(--bg-hover)] transition-colors"
                    style={{ color: 'var(--danger)' }}>
                    <ThumbsDown size={11} />Нет
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ReactionBubble ────────────────────────────────────────────────────────────

function ReactionBubble({ reaction, index }: { reaction: AgentReaction; index: number }) {
  const agentCfg  = AGENT_CONFIG[reaction.from_id];
  const toneCfg   = TONE_CONFIG[reaction.tone];
  const AgentIcon = agentCfg?.icon ?? Shield;
  const ToneIcon  = toneCfg.icon;

  return (
    <div className="flex gap-3 items-start" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${reaction.color}20`, border: `1.5px solid ${reaction.color}50` }}>
        <AgentIcon size={14} style={{ color: reaction.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-bold text-[var(--text-primary)]">{reaction.from_name}</span>
          <span className="text-xs text-[var(--text-muted)]">{reaction.from_role}</span>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: `${toneCfg.color}15`, color: toneCfg.color, border: `1px solid ${toneCfg.color}30` }}>
            <ToneIcon size={9} />{toneCfg.label}
          </div>
        </div>
        <div className="p-3 rounded-lg rounded-tl-none text-sm text-[var(--text-secondary)]"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
          {reaction.content}
        </div>
      </div>
    </div>
  );
}

// ── ProposalCard ──────────────────────────────────────────────────────────────

function ProposalCard({ proposal }: { proposal: AgentProposal }) {
  const [decision,   setDecision]   = useState<'approved' | 'rejected' | null>(
    proposal.needs_approval ? null : 'approved'
  );
  const [processing, setProcessing] = useState(false);

  const agentCfg    = AGENT_CONFIG[proposal.from_id];
  const AgentIcon   = agentCfg?.icon ?? Shield;
  const priorityCfg = PRIORITY_CONFIG[proposal.priority];

  const handleDecision = async (action: 'approve' | 'reject') => {
    if (!proposal.approval_id) return;
    setProcessing(true);
    try {
      await fetch('/api/agents/approvals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ approval_id: proposal.approval_id, action }),
      });
      setDecision(action === 'approve' ? 'approved' : 'rejected');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="ds-card overflow-hidden" style={{ borderLeft: `3px solid ${proposal.color}` }}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${proposal.color}20`, border: `1px solid ${proposal.color}40` }}>
            <AgentIcon size={14} style={{ color: proposal.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-bold text-[var(--text-primary)]">{proposal.from_name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: `${priorityCfg.color}15`, color: priorityCfg.color, border: `1px solid ${priorityCfg.color}30` }}>
                {priorityCfg.label}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {ACTION_TYPE_LABELS[proposal.action_type] ?? proposal.action_type}
              </span>
            </div>
            <div className="font-bold text-sm text-[var(--text-primary)]">{proposal.title}</div>
          </div>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">{proposal.description}</p>

        <div className="flex items-center gap-2">
          {decision === 'approved' ? (
            <span className="flex items-center gap-1.5 text-xs text-[var(--success)] font-medium">
              <CheckCircle size={12} />
              {!proposal.needs_approval ? 'Принято автоматически' : 'Одобрено'}
            </span>
          ) : decision === 'rejected' ? (
            <span className="flex items-center gap-1.5 text-xs text-[var(--danger)] font-medium">
              <X size={12} />Отклонено
            </span>
          ) : (
            <>
              <button type="button" onClick={() => handleDecision('approve')} disabled={processing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
                style={{ background: 'var(--success)', color: 'var(--bg-primary)' }}>
                {processing ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Одобрить
              </button>
              <button type="button" onClick={() => handleDecision('reject')} disabled={processing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
                style={{ color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}>
                <X size={11} />Отклонить
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BoardMeetingClient() {
  const [topic,          setTopic]          = useState('');
  const [meetingId,      setMeetingId]      = useState('');
  const [startedAt,      setStartedAt]      = useState('');
  const [agents,         setAgents]         = useState<AgentReport[]>([]);
  const [pendingAgent,   setPendingAgent]   = useState<{ id: string; name: string; role: string } | null>(null);
  const [reactions,      setReactions]      = useState<AgentReaction[]>([]);
  const [consensus,      setConsensus]      = useState('');
  const [proposals,      setProposals]      = useState<AgentProposal[]>([]);
  const [durationMs,     setDurationMs]     = useState(0);
  const [stage,          setStage]          = useState(-1);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsCount,   setSignalsCount]   = useState(0);
  const [error,          setError]          = useState<string | null>(null);
  const [decision,       setDecision]       = useState('');
  const [saved,          setSaved]          = useState(false);
  const [saving,         setSaving]         = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const isDone    = stage === 4;
  const isRunning = stage >= 0 && !isDone;

  async function sendFeedback(intent: string, rating: 'good' | 'bad') {
    try {
      await fetch('/api/agents/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating, intent }),
      });
    } catch { /* non-critical */ }
  }

  async function handleStart() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setAgents([]); setPendingAgent(null); setReactions([]);
    setConsensus(''); setProposals([]); setDurationMs(0);
    setMeetingId(''); setStartedAt(''); setError(null);
    setSaved(false); setDecision(''); setStage(0);
    setSignalsLoading(false); setSignalsCount(0);

    try {
      const res = await fetch('/api/agents/board-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() || null }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) { setError(`Ошибка сервера: ${res.status}`); setStage(-1); return; }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: StreamEvent;
          try { event = JSON.parse(line.slice(6)) as StreamEvent; } catch { continue; }

          switch (event.type) {
            case 'meeting_start':  setMeetingId(event.meeting_id); setStartedAt(event.started_at); setStage(0); break;
            case 'signals_start':  setSignalsLoading(true); break;
            case 'signals_done':   setSignalsLoading(false); setSignalsCount(event.count); break;
            case 'agent_start':    setPendingAgent({ id: event.id, name: event.name, role: event.role }); break;
            case 'agent_done':     setAgents(prev => [...prev, event.agent]); setPendingAgent(null); break;
            case 'round2_start':   setStage(1); break;
            case 'reactions_done': setReactions(event.reactions); break;
            case 'round3_start':   setStage(2); break;
            case 'consensus_done': setConsensus(event.consensus); break;
            case 'round4_start':   setStage(3); break;
            case 'proposal':       setProposals(prev => [...prev, event.proposal]); break;
            case 'done':           setConsensus(c => c || event.consensus); setDurationMs(event.duration_ms); setStage(4); setPendingAgent(null); break;
            case 'error':          setError(event.message); setStage(-1); break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') { setError(e instanceof Error ? e.message : 'Сетевая ошибка'); setStage(-1); }
    }
  }

  async function handleSaveDecision() {
    if (!meetingId || !decision.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/agents/board-meeting', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ meeting_id: meetingId, decision }),
      });
      setSaved(true);
    } finally { setSaving(false); }
  }

  const okCount  = agents.filter(a => a.status === 'ok').length;
  const errCount = agents.filter(a => a.status === 'error').length;

  return (
    <div className="ds-page max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
          <Users size={20} className="text-[var(--bg-primary)]" />
        </div>
        <div>
          <h1 className="ds-h1">Совет директоров</h1>
          <p className="text-sm text-[var(--text-muted)]">4 раунда: отчёты — реакции — консенсус — инициативы</p>
        </div>
      </div>

      {/* Pre-meeting */}
      {stage === -1 && (
        <div className="ds-card p-8 text-center mb-6">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent)20' }}>
            <PlayCircle size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="ds-h2 mb-1">Открыть совещание</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Агенты появляются по мере готовности. В конце каждый выдвигает инициативу на одобрение.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mb-6">
            {Object.entries(AGENT_CONFIG).map(([id, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                  <Icon size={11} />{cfg.label}
                </div>
              );
            })}
          </div>
          <div className="mb-6 max-w-md mx-auto text-left">
            <label className="ds-label block mb-1.5">Тема совещания</label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Например: как увеличить конверсию на 20% за квартал?"
              maxLength={500}
              rows={3}
              className="ds-input w-full resize-none text-sm"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Необязательно. Агенты учтут тему при подготовке отчётов и инициатив.
            </p>
          </div>
          <button onClick={handleStart} className="ds-btn-primary px-8 py-3 text-sm font-bold">
            Открыть совещание
          </button>
        </div>
      )}

      {/* Running / Done */}
      {stage >= 0 && (
        <>
          {/* Meta bar */}
          <div className="ds-card p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {isDone
                ? <CheckCircle size={14} className="text-[var(--success)]" />
                : <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />}
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {meetingId ? `Совещание ${meetingId.replace('mtg_', '#')}` : 'Начинается...'}
              </span>
              {startedAt && (
                <span className="text-xs text-[var(--text-muted)]">{new Date(startedAt).toLocaleString('ru-RU')}</span>
              )}
              {topic && (
                <span className="text-xs font-medium text-[var(--ocean)] max-w-[220px] truncate">
                  Тема: {topic}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              {okCount > 0 && <span className="flex items-center gap-1"><CheckCircle size={11} className="text-[var(--success)]" />{inflect(okCount, 'агент', 'агента', 'агентов')}</span>}
              {errCount > 0 && <span style={{ color: 'var(--warning)' }}>{inflect(errCount, 'ошибка', 'ошибки', 'ошибок')}</span>}
              <span className="flex items-center gap-1"><MessageSquare size={11} />{inflect(reactions.length, 'реакция', 'реакции', 'реакций')}</span>
              {signalsLoading && <span className="flex items-center gap-1" style={{ color: 'var(--ocean)' }}><Loader2 size={11} className="animate-spin" />разведка...</span>}
              {!signalsLoading && signalsCount > 0 && <span className="flex items-center gap-1" style={{ color: 'var(--ocean)' }}><Globe size={11} />{inflect(signalsCount, 'сигнал', 'сигнала', 'сигналов')}</span>}
              {proposals.length > 0 && <span className="flex items-center gap-1"><Lightbulb size={11} style={{ color: 'var(--accent)' }} />{inflect(proposals.length, 'инициатива', 'инициативы', 'инициатив')}</span>}
              {isDone && <span className="flex items-center gap-1"><Clock size={11} />{(durationMs / 1000).toFixed(1)}с</span>}
              {isDone && <button onClick={handleStart} className="ds-btn px-2.5 py-1 text-xs">Повторить</button>}
            </div>
          </div>

          {/* Stage progress */}
          {isRunning && (
            <div className="ds-card p-4 text-center mb-4">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {signalsLoading         ? 'Разведка — агенты мониторят внешние источники...' :
                 stage === 0            ? 'Раунд 1 — агенты готовят отчёты...' :
                 stage === 1            ? 'Раунд 2 — перекрёстные реакции...' :
                 stage === 2            ? 'Раунд 3 — фасилитатор синтезирует консенсус...' :
                                          'Раунд 4 — агенты выдвигают инициативы...'}
              </p>
              {signalsLoading ? (
                <div className="flex justify-center gap-2 mt-4 flex-wrap">
                  {['Новости туризма', 'Законодательство', 'Тренды рынка', 'Безопасность', 'Экология'].map(t => (
                    <span key={t} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--ocean)10', color: 'var(--ocean)', border: '1px solid var(--ocean)20' }}>
                      <Globe size={9} />{t}
                    </span>
                  ))}
                </div>
              ) : (
                <StagePills stage={stage} />
              )}
            </div>
          )}

          {/* Раунд 1 */}
          {(agents.length > 0 || pendingAgent) && (
            <div className="mb-6">
              <SectionHeader num={1} label="Отчёты" />
              <div className="space-y-2">
                {agents.map(a => <AgentCard key={a.id} agent={a} onFeedback={sendFeedback} />)}
                {pendingAgent && <AgentCard pending={pendingAgent} onFeedback={sendFeedback} />}
              </div>
            </div>
          )}

          {/* Раунд 2 */}
          {reactions.length > 0 && (
            <div className="mb-6">
              <SectionHeader num={2} label="Перекрёстные реакции" sub="— агенты отвечают на чужие отчёты" />
              <div className="ds-card p-4 space-y-4">
                {reactions.map((r, i) => <ReactionBubble key={`${r.from_id}-${i}`} reaction={r} index={i} />)}
              </div>
            </div>
          )}
          {isDone && reactions.length === 0 && (
            <div className="mb-4 flex items-center gap-2 px-1">
              <span className="w-5 h-5 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-bold">Перекрёстные реакции</span>
              <span className="text-xs text-[var(--text-muted)]">— агенты сочли реакции излишними</span>
            </div>
          )}

          {/* Раунд 3 */}
          {consensus && consensus !== 'AI-синтез недоступен.' && (
            <div className="mb-6">
              <SectionHeader num={3} label="Консенсус" />
              <div className="ds-card p-5" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <GitMerge size={15} style={{ color: 'var(--accent)' }} />
                  <span className="font-bold text-sm text-[var(--text-primary)]">Итог совещания — фасилитатор AI Эволюция</span>
                </div>
                <div className="space-y-0.5">{renderFormattedText(consensus)}</div>
              </div>
            </div>
          )}

          {/* Раунд 4: Инициативы */}
          {(proposals.length > 0 || stage === 3) && (
            <div className="mb-6">
              <SectionHeader num={4} label="Инициативы агентов" sub="— конкретные действия на одобрение" />
              {proposals.length === 0 && stage === 3 && (
                <div className="ds-card p-4 flex items-center gap-3">
                  <Loader2 size={14} className="animate-spin shrink-0" style={{ color: 'var(--accent)' }} />
                  <span className="text-sm text-[var(--text-muted)]">Агенты формулируют предложения...</span>
                </div>
              )}
              <div className="space-y-3">
                {proposals.map((p, i) => <ProposalCard key={`${p.from_id}-${i}`} proposal={p} />)}
              </div>
              {isDone && proposals.length === 0 && (
                <div className="ds-card p-4 text-center">
                  <Zap size={16} className="mx-auto mb-1 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-muted)]">Агенты не выдвинули срочных инициатив</span>
                </div>
              )}
            </div>
          )}

          {/* Решение директора */}
          {isDone && (
            <div className="ds-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={15} style={{ color: 'var(--accent)' }} />
                <span className="font-bold text-sm text-[var(--text-primary)]">Решение директора</span>
              </div>
              <textarea value={decision} onChange={e => { setDecision(e.target.value); setSaved(false); }}
                placeholder="Стратегическое решение по итогам совещания..."
                className="ds-input w-full min-h-[120px] resize-y text-sm" />
              <div className="flex items-center justify-between mt-3">
                {saved
                  ? <span className="flex items-center gap-1.5 text-xs text-[var(--success)]"><CheckCircle size={12} />Зафиксировано — войдёт в контекст следующего совещания</span>
                  : <span className="text-xs text-[var(--text-muted)]">Будет передано агентам на следующем совещании</span>}
                <button onClick={handleSaveDecision} disabled={!decision.trim() || saving}
                  className="ds-btn-primary px-4 py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {saving ? <><Loader2 size={11} className="animate-spin" />Сохраняю...</> : <><Download size={11} />Зафиксировать</>}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {error && (
        <div className="ds-card p-4 mt-4 flex items-center gap-3" style={{ borderLeft: '3px solid var(--danger)' }}>
          <AlertCircle size={16} className="text-[var(--danger)] shrink-0" />
          <span className="text-sm text-[var(--danger)] flex-1">{error}</span>
          <button onClick={handleStart} className="ds-btn px-3 py-1 text-xs shrink-0">Повторить</button>
        </div>
      )}
    </div>
  );
}
