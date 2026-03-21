'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Shield, Scale, Lock, TrendingUp, Binoculars, Leaf, FileSearch, Star,
  Cpu, PlayCircle, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp,
  Download, Loader2, Users, MessageSquare, GitMerge, TriangleAlert, ThumbsUp,
  HelpCircle, Swords,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReactionTone = 'alert' | 'support' | 'conflict' | 'question';

interface AgentReaction {
  from_id:     string;
  from_name:   string;
  from_role:   string;
  content:     string;
  tone:        ReactionTone;
  color:       string;
  duration_ms: number;
}

interface AgentReport {
  id:          string;
  name:        string;
  role:        string;
  intent:      string;
  report:      string;
  duration_ms: number;
  status:      'ok' | 'error';
}

interface MeetingData {
  meeting_id:  string;
  started_at:  string;
  agents:      AgentReport[];
  reactions:   AgentReaction[];
  consensus:   string;
  synthesis:   string;
  duration_ms: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const AGENT_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  admin:    { icon: Shield,      color: 'var(--accent)',   label: 'Администратор' },
  legal:    { icon: Scale,       color: '#8B5CF6',         label: 'Юрист'         },
  security: { icon: Lock,        color: 'var(--danger)',   label: 'Безопасность'  },
  hacker:   { icon: TrendingUp,  color: 'var(--success)',  label: 'Хакер'         },
  rescue:   { icon: Binoculars,  color: 'var(--warning)',  label: 'Спасатель'     },
  eco:      { icon: Leaf,        color: '#10B981',         label: 'Эколог'        },
  content:  { icon: FileSearch,  color: 'var(--ocean)',    label: 'Аудитор'       },
  quality:  { icon: Star,        color: '#F59E0B',         label: 'Качество'      },
  evo:      { icon: Cpu,         color: '#EC4899',         label: 'Эволюция'      },
};

const TONE_CONFIG: Record<ReactionTone, {
  icon: LucideIcon; label: string; bgToken: string; textToken: string;
}> = {
  alert:    { icon: TriangleAlert, label: 'Предупреждение', bgToken: 'var(--danger)',  textToken: 'var(--danger)'  },
  support:  { icon: ThumbsUp,      label: 'Поддерживаю',   bgToken: 'var(--success)', textToken: 'var(--success)' },
  conflict: { icon: Swords,        label: 'Конфликт',      bgToken: '#F59E0B',         textToken: '#F59E0B'        },
  question: { icon: HelpCircle,    label: 'Вопрос',        bgToken: 'var(--ocean)',    textToken: 'var(--ocean)'   },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatReport(text: string): string {
  return text.replace(/<b>(.*?)<\/b>/g, '**$1**').replace(/<[^>]+>/g, '');
}

function renderFormattedText(text: string) {
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    if (t.startsWith('**') && t.endsWith('**')) {
      return (
        <div key={i} className="font-bold text-[var(--text-primary)] mt-3 mb-1 text-sm">
          {t.slice(2, -2)}
        </div>
      );
    }
    if (t.startsWith('•') || t.startsWith('-') || /^\d+\./.test(t)) {
      const content = t.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
      return (
        <div key={i} className="flex gap-2 text-sm text-[var(--text-secondary)] ml-2">
          <span className="text-[var(--accent)] mt-0.5 shrink-0">•</span>
          <span>{content}</span>
        </div>
      );
    }
    return <div key={i} className="text-sm text-[var(--text-secondary)]">{t}</div>;
  });
}

// ── AgentCard ─────────────────────────────────────────────────────────────────

function AgentCard({ agent, index }: { agent: AgentReport; index: number }) {
  const [expanded, setExpanded] = useState(index < 1);
  const cfg = AGENT_CONFIG[agent.id] ?? { icon: Shield, color: 'var(--accent)', label: agent.name };
  const Icon = cfg.icon;

  return (
    <div className="ds-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}
        >
          <Icon size={16} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="font-bold text-[var(--text-primary)] text-sm">{agent.name}</div>
          <div className="text-xs text-[var(--text-muted)] truncate">{agent.role}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {agent.status === 'ok'
            ? <span className="flex items-center gap-1 text-xs text-[var(--success)] font-medium"><CheckCircle size={12} />Готов</span>
            : <span className="flex items-center gap-1 text-xs text-[var(--danger)] font-medium"><AlertCircle size={12} />Ошибка</span>
          }
          <span className="text-xs text-[var(--text-muted)]">{(agent.duration_ms / 1000).toFixed(1)}с</span>
          {expanded ? <ChevronUp size={13} className="text-[var(--text-muted)]" /> : <ChevronDown size={13} className="text-[var(--text-muted)]" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-0.5">
          {renderFormattedText(formatReport(agent.report))}
        </div>
      )}
    </div>
  );
}

// ── ReactionBubble ────────────────────────────────────────────────────────────

function ReactionBubble({ reaction, index }: { reaction: AgentReaction; index: number }) {
  const agentCfg = AGENT_CONFIG[reaction.from_id];
  const toneCfg  = TONE_CONFIG[reaction.tone];
  const AgentIcon = agentCfg?.icon ?? Shield;
  const ToneIcon  = toneCfg.icon;

  return (
    <div
      className="flex gap-3 items-start"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: `${reaction.color}20`,
          border:     `1.5px solid ${reaction.color}50`,
        }}
      >
        <AgentIcon size={14} style={{ color: reaction.color }} />
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-[var(--text-primary)]">{reaction.from_name}</span>
          <span className="text-xs text-[var(--text-muted)]">{reaction.from_role}</span>
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              background: `${toneCfg.bgToken}15`,
              color:      toneCfg.textToken,
              border:     `1px solid ${toneCfg.bgToken}30`,
            }}
          >
            <ToneIcon size={9} />
            {toneCfg.label}
          </div>
        </div>
        <div
          className="p-3 rounded-lg rounded-tl-none text-sm text-[var(--text-secondary)]"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
        >
          {reaction.content}
        </div>
      </div>
    </div>
  );
}

// ── Loading stages ────────────────────────────────────────────────────────────

const LOADING_STAGES = [
  { label: 'Раунд 1: отчёты агентов',   hint: '9 агентов работают параллельно' },
  { label: 'Раунд 2: перекрёстные реакции', hint: 'Агенты читают чужие отчёты'    },
  { label: 'Раунд 3: консенсус',          hint: 'Фасилитатор синтезирует итог'    },
];

function LoadingPanel({ stage }: { stage: number }) {
  return (
    <div className="ds-card p-8 text-center mb-6">
      <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
      <p className="font-bold text-[var(--text-primary)] mb-0.5">
        {LOADING_STAGES[stage]?.label ?? 'Обрабатываю...'}
      </p>
      <p className="text-sm text-[var(--text-muted)] mb-5">
        {LOADING_STAGES[stage]?.hint ?? ''}
      </p>
      {/* Stage dots */}
      <div className="flex justify-center gap-2">
        {LOADING_STAGES.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all"
            style={{
              background: i === stage ? 'var(--accent)' : 'var(--bg-hover)',
              color:      i === stage ? 'var(--bg-primary)' : 'var(--text-muted)',
              fontWeight: i === stage ? '700' : '400',
            }}
          >
            {i + 1}. {s.label.split(':')[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BoardMeetingClient() {
  const [meeting, setMeeting]   = useState<MeetingData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [loadStage, setLoadStage] = useState(0);
  const [error, setError]       = useState<string | null>(null);
  const [decision, setDecision] = useState('');
  const [saved, setSaved]       = useState(false);
  const [saving, setSaving]     = useState(false);

  async function handleStart() {
    setLoading(true);
    setLoadStage(0);
    setError(null);
    setMeeting(null);
    setSaved(false);
    setDecision('');

    // Simulate stage progression (cosmetic — actual stages run server-side)
    const t1 = setTimeout(() => setLoadStage(1), 18000);
    const t2 = setTimeout(() => setLoadStage(2), 38000);

    try {
      const res  = await fetch('/api/agents/board-meeting', { method: 'POST' });
      const json = await res.json() as { success: boolean; error?: string } & Partial<MeetingData>;

      if (!json.success || !json.agents) {
        setError(json.error ?? 'Неизвестная ошибка');
        return;
      }

      setMeeting({
        meeting_id:  json.meeting_id  ?? '',
        started_at:  json.started_at  ?? '',
        agents:      json.agents,
        reactions:   json.reactions   ?? [],
        consensus:   json.consensus   ?? json.synthesis ?? '',
        synthesis:   json.synthesis   ?? '',
        duration_ms: json.duration_ms ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Сетевая ошибка');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
    }
  }

  async function handleSaveDecision() {
    if (!meeting || !decision.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/agents/board-meeting', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ meeting_id: meeting.meeting_id, decision }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const okCount  = meeting?.agents.filter(a => a.status === 'ok').length  ?? 0;
  const errCount = meeting?.agents.filter(a => a.status === 'error').length ?? 0;

  return (
    <div className="ds-page max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
            <Users size={20} className="text-[var(--bg-primary)]" />
          </div>
          <div>
            <h1 className="ds-h1">Совет директоров</h1>
            <p className="text-sm text-[var(--text-muted)]">
              9 AI-агентов докладывают, обсуждают между собой и формируют консенсус
            </p>
          </div>
        </div>
      </div>

      {/* Pre-meeting */}
      {!meeting && !loading && (
        <div className="ds-card p-8 text-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent)20' }}
          >
            <PlayCircle size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="ds-h2 mb-1">Открыть совещание</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-2 max-w-md mx-auto">
            3 раунда: отчёты → перекрёстные реакции → консенсус. Займёт 40–60 секунд.
          </p>

          {/* How it works */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center mb-6 text-xs text-[var(--text-muted)]">
            {LOADING_STAGES.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-hover)]">
                <span className="font-bold" style={{ color: 'var(--accent)' }}>{i + 1}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Agent chips */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-6">
            {Object.entries(AGENT_CONFIG).map(([id, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div
                  key={id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                >
                  <Icon size={11} />
                  {cfg.label}
                </div>
              );
            })}
          </div>

          <button onClick={handleStart} className="ds-btn-primary px-8 py-3 text-sm font-bold">
            Открыть совещание
          </button>
        </div>
      )}

      {loading && <LoadingPanel stage={loadStage} />}

      {error && (
        <div className="ds-card p-4 mb-6 flex items-center gap-3" style={{ borderLeft: '3px solid var(--danger)' }}>
          <AlertCircle size={16} className="text-[var(--danger)] shrink-0" />
          <span className="text-sm text-[var(--danger)]">{error}</span>
        </div>
      )}

      {meeting && (
        <>
          {/* Meta bar */}
          <div className="ds-card p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-[var(--success)]" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Совещание {meeting.meeting_id.replace('mtg_', '#')}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {new Date(meeting.started_at).toLocaleString('ru-RU')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span><CheckCircle size={11} className="inline mr-0.5 text-[var(--success)]" />{okCount} агентов</span>
              {errCount > 0 && <span className="text-[var(--warning)]">{errCount} ошибки</span>}
              <span><MessageSquare size={11} className="inline mr-0.5" />{meeting.reactions.length} реакций</span>
              <span><Clock size={11} className="inline mr-0.5" />{(meeting.duration_ms / 1000).toFixed(1)}с</span>
              <button onClick={handleStart} className="ds-btn px-2.5 py-1 text-xs">Повторить</button>
            </div>
          </div>

          {/* ── Раунд 1: отчёты ── */}
          <div className="mb-1">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Отчёты</span>
            </div>
            <div className="space-y-2 mb-6">
              {meeting.agents.map((agent, i) => (
                <AgentCard key={agent.id} agent={agent} index={i} />
              ))}
            </div>
          </div>

          {/* ── Раунд 2: реакции ── */}
          {meeting.reactions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-bold flex items-center justify-center">2</span>
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                  Перекрёстные реакции
                </span>
                <span className="text-xs text-[var(--text-muted)]">— агенты отвечают на чужие отчёты</span>
              </div>
              <div className="ds-card p-4 space-y-4">
                {meeting.reactions.map((r, i) => (
                  <ReactionBubble key={`${r.from_id}-${i}`} reaction={r} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── Раунд 3: консенсус ── */}
          {meeting.consensus && meeting.consensus !== 'AI-синтез недоступен.' && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-bold flex items-center justify-center">3</span>
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Консенсус</span>
              </div>
              <div
                className="ds-card p-5"
                style={{ borderLeft: '3px solid var(--accent)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <GitMerge size={15} style={{ color: 'var(--accent)' }} />
                  <span className="font-bold text-sm text-[var(--text-primary)]">
                    Итог совещания — фасилитатор AI Эволюция
                  </span>
                </div>
                <div className="space-y-0.5">
                  {renderFormattedText(meeting.consensus)}
                </div>
              </div>
            </div>
          )}

          {/* ── Решение директора ── */}
          <div className="ds-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={15} style={{ color: 'var(--accent)' }} />
              <span className="font-bold text-sm text-[var(--text-primary)]">Решение директора</span>
            </div>
            <textarea
              value={decision}
              onChange={e => { setDecision(e.target.value); setSaved(false); }}
              placeholder="Введите решение по результатам совещания..."
              className="ds-input w-full min-h-[120px] resize-y text-sm"
            />
            <div className="flex items-center justify-between mt-3">
              {saved
                ? <span className="flex items-center gap-1.5 text-xs text-[var(--success)]"><CheckCircle size={12} />Решение зафиксировано</span>
                : <span className="text-xs text-[var(--text-muted)]">Будет записано в журнал AI-агентов</span>
              }
              <button
                onClick={handleSaveDecision}
                disabled={!decision.trim() || saving}
                className="ds-btn-primary px-4 py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving
                  ? <><Loader2 size={11} className="animate-spin" />Сохраняю...</>
                  : <><Download size={11} />Зафиксировать</>
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
