'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Brain, RefreshCw, AlertCircle, CheckCircle, XCircle,
  Clock, Zap, Play, ChevronDown, ChevronRight, FlaskConical,
  ShieldCheck, TrendingUp, ThumbsUp, ThumbsDown, Activity,
  Shield, Scale, Lock, Binoculars, Leaf, FileSearch, Star,
  Cpu, BarChart3, Megaphone, CalendarDays, GitMerge, Network,
  Loader2, ExternalLink, UserCheck, Target, Terminal, X,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Observation {
  id: string;
  action_type: string;
  metadata: {
    intent?: string;
    decision?: string;
    result?: 'success' | 'fail' | 'pending';
    duration_ms?: number;
    user_id?: number;
    error_message?: string;
  };
  created_at: string;
}

interface ActivityStats {
  total: number;
  success: number;
  fail: number;
  success_rate: number | null;
  success_rate_24h: number;
  platform: { routesCount: number; activeOperators: number; toursCount: number };
}

interface ActivityResponse {
  success: boolean;
  data: Observation[];
  stats: ActivityStats;
}

interface DispatchResponse {
  success: boolean;
  intent: string;
  response: string;
  duration_ms: number;
}

interface SystemPattern {
  pattern_type: 'slow_intent' | 'failing_intent' | 'high_usage';
  intent: string;
  description: string;
  recommendation: string;
  severity: 'critical' | 'warning' | 'info';
}

interface IntentMetric {
  intent: string;
  count: number;
  success_rate: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  error_rate: number;
}

interface RecentFeedback {
  rating: string;
  intent: string;
  comment?: string;
  created_at: string;
}

interface InsightsData {
  patterns: SystemPattern[];
  metrics: IntentMetric[];
  feedback: {
    total_feedback: number;
    overall_satisfaction: number;
    worst_intent: string | null;
    best_intent: string | null;
  };
  recentFeedback: RecentFeedback[];
}

interface InsightsResponse { success: boolean; data: InsightsData; meta: { hours: number } }

interface Experiment {
  id: string;
  name: string;
  description: string | null;
  intent: string | null;
  variant_a: Record<string, unknown>;
  variant_b: Record<string, unknown>;
  status: 'running' | 'paused' | 'completed';
  winner: 'a' | 'b' | 'tie' | null;
  metric: string;
  created_at: string;
}

interface SDKSession {
  variant: string;
  count: number;
  avg_duration_ms: number;
  avg_tool_calls: number;
  success_rate: number;
}

interface ExperimentsResponse { success: boolean; data: Experiment[] }

interface Approval {
  id: string;
  action_type: string;
  description: string | null;
  topic: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  executor_agent_id: string | null;
  executor_name: string | null;
  execution_status: 'pending' | 'assigned' | 'in_progress' | 'done' | 'failed' | null;
  execution_notes: string | null;
  due_date: string | null;
  requested_by: string | null;
  expires_at: string | null;
  created_at: string;
}

interface ApprovalsResponse { success: boolean; data: Approval[]; total: number }

type Tab = 'activity' | 'insights' | 'experiments' | 'approvals' | 'registry' | 'mesh';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function agentLabel(actionType: string): string {
  return actionType.replace('agent_', '');
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function ResultBadge({ result }: { result?: string }) {
  if (result === 'success') return (
    <span className="flex items-center gap-1 text-[var(--success)]">
      <CheckCircle className="w-3 h-3" /><span className="text-xs font-mono">ok</span>
    </span>
  );
  if (result === 'fail') return (
    <span className="flex items-center gap-1 text-[var(--danger)]">
      <XCircle className="w-3 h-3" /><span className="text-xs font-mono">fail</span>
    </span>
  );
  return <span className="text-xs text-[var(--text-muted)] font-mono">—</span>;
}

function SeverityBadge({ sev }: { sev: SystemPattern['severity'] }) {
  const cfg = {
    critical: 'bg-red-100 dark:bg-red-900/30 text-[var(--danger)]',
    warning:  'bg-yellow-100 dark:bg-yellow-900/30 text-[var(--warning)]',
    info:     'bg-blue-100 dark:bg-blue-900/30 text-[var(--ocean)]',
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${cfg[sev]}`}>{sev}</span>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-4 py-3 border-b border-[var(--border)]">
      {label}
    </p>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">{text}</div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────

function ActivityTab({
  data, loading, error, hours, fetchActivity, expanded, setExpanded,
  message, setMessage, dispatching, dispatchRes, handleDispatch,
}: {
  data: ActivityResponse | null;
  loading: boolean;
  error: string;
  hours: number;
  fetchActivity: (h?: number) => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  message: string;
  setMessage: (v: string) => void;
  dispatching: boolean;
  dispatchRes: DispatchResponse | null;
  handleDispatch: () => void;
}) {
  const stats = data?.stats;
  return (
    <div className="space-y-4">
      {stats && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Вызовов',    value: String(stats.total),          mono: true },
            { label: 'Успешных',   value: String(stats.success),        mono: true },
            { label: 'Ошибок',     value: String(stats.fail),           mono: true },
            { label: 'Успех 24ч',  value: `${stats.success_rate_24h}%`, mono: true },
            { label: 'Маршрутов',  value: String(stats.platform?.routesCount  ?? '—') },
            { label: 'Операторов', value: String(stats.platform?.activeOperators ?? '—') },
            { label: 'Туров',      value: String(stats.platform?.toursCount     ?? '—') },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3 min-w-[100px]">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">{s.label}</p>
              <span className={`text-lg font-semibold text-[var(--text-primary)] ${s.mono ? 'font-mono' : ''}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Запустить агента</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleDispatch(); }}
            placeholder="дайджест / мои туры / хочу на вулкан..."
            className="ds-input flex-1 text-sm"
          />
          <button
            onClick={handleDispatch}
            disabled={dispatching || !message.trim()}
            className="ds-btn ds-btn-primary flex items-center gap-1.5 px-3 text-xs disabled:opacity-50"
          >
            <Play className="w-3 h-3" />{dispatching ? 'Идёт...' : 'Запустить'}
          </button>
        </div>
        {dispatchRes && (
          <div className={`rounded-md p-3 text-xs font-mono whitespace-pre-wrap ${
            dispatchRes.success
              ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
              : 'bg-red-50 dark:bg-red-900/20 text-[var(--danger)]'
          }`}>
            {dispatchRes.success && (
              <div className="flex items-center gap-2 mb-2 text-[var(--text-muted)]">
                <span>intent: <b className="text-[var(--text-primary)]">{dispatchRes.intent}</b></span>
                <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {dispatchRes.duration_ms}ms</span>
              </div>
            )}
            <div className="whitespace-pre-wrap">{dispatchRes.response}</div>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <SectionHeader label="Журнал наблюдений" />
        {error && (
          <div className="p-4 flex items-center gap-2 text-[var(--danger)]">
            <AlertCircle className="w-4 h-4 shrink-0" /><span className="text-xs">{error}</span>
          </div>
        )}
        {loading && !data && (
          <div className="divide-y divide-[var(--border)]">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                <div className="h-3 w-20 bg-[var(--bg-hover)] rounded" />
                <div className="h-3 w-32 bg-[var(--bg-hover)] rounded" />
                <div className="h-3 w-48 bg-[var(--bg-hover)] rounded flex-1" />
              </div>
            ))}
          </div>
        )}
        {data && data.data.length === 0 && <EmptyState text="Нет наблюдений за выбранный период" />}
        {data && data.data.length > 0 && (
          <div className="divide-y divide-[var(--border)]">
            {data.data.map(obs => {
              const isEx = expanded === obs.id;
              const meta = obs.metadata;
              return (
                <div key={obs.id}>
                  <button
                    onClick={() => setExpanded(isEx ? null : obs.id)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
                  >
                    {isEx
                      ? <ChevronDown  className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />}
                    <span className="text-[10px] font-mono text-[var(--text-muted)] w-16 shrink-0">{fmtTime(obs.created_at)}</span>
                    <span className="text-xs font-mono text-[var(--ocean)] w-32 shrink-0 truncate">{agentLabel(obs.action_type)}</span>
                    <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">{meta.intent ?? '—'}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] w-16 text-right shrink-0">{meta.decision ?? ''}</span>
                    {meta.duration_ms && (
                      <span className="flex items-center gap-0.5 text-[10px] font-mono text-[var(--text-muted)] w-14 text-right shrink-0">
                        <Zap className="w-2.5 h-2.5" />{meta.duration_ms}ms
                      </span>
                    )}
                    <div className="w-12 text-right shrink-0"><ResultBadge result={meta.result} /></div>
                  </button>
                  {isEx && (
                    <div className="px-10 pb-3 pt-1">
                      <pre className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-md p-3 overflow-x-auto">
                        {JSON.stringify(meta, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Insights Tab ──────────────────────────────────────────────────────────────

function InsightsTab({ hours }: { hours: number }) {
  const [data, setData]    = useState<InsightsData | null>(null);
  const [loading, setLoad] = useState(true);
  const [error, setError]  = useState('');

  useEffect(() => {
    setLoad(true);
    fetch(`/api/agents/insights?hours=${hours}`)
      .then(r => r.json() as Promise<InsightsResponse>)
      .then(j => { if (j.success) setData(j.data); else setError('Ошибка загрузки'); })
      .catch(() => setError('Ошибка запроса'))
      .finally(() => setLoad(false));
  }, [hours]);

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />
      ))}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-[var(--danger)] text-sm p-4">
      <AlertCircle className="w-4 h-4" />{error}
    </div>
  );

  if (!data) return null;

  const { patterns, metrics, feedback, recentFeedback } = data;

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex flex-wrap gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Удовлетворённость</p>
          <span className="text-3xl font-mono font-semibold text-[var(--text-primary)]">
            {pct(feedback.overall_satisfaction)}
          </span>
          {feedback.total_feedback > 0 && (
            <span className="ml-2 text-xs text-[var(--text-muted)]">{feedback.total_feedback} отзывов</span>
          )}
        </div>
        {feedback.worst_intent && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Проблемный интент</p>
            <span className="text-sm font-mono text-[var(--danger)]">{feedback.worst_intent}</span>
          </div>
        )}
        {feedback.best_intent && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Лучший интент</p>
            <span className="text-sm font-mono text-[var(--success)]">{feedback.best_intent}</span>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <SectionHeader label={`Паттерны (${patterns.length})`} />
        {patterns.length === 0
          ? <EmptyState text="Нарушений не обнаружено" />
          : (
            <div className="divide-y divide-[var(--border)]">
              {patterns.map((p, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <SeverityBadge sev={p.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-primary)]">{p.description}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{p.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {metrics.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <SectionHeader label="Метрики интентов" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  <th className="px-4 py-2 text-left font-medium">Интент</th>
                  <th className="px-4 py-2 text-right font-medium">Вызовов</th>
                  <th className="px-4 py-2 text-right font-medium">Успех</th>
                  <th className="px-4 py-2 text-right font-medium">Ошибки</th>
                  <th className="px-4 py-2 text-right font-medium">avg ms</th>
                  <th className="px-4 py-2 text-right font-medium">p95 ms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {metrics.map((m, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-2 font-mono text-[var(--ocean)]">{m.intent}</td>
                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{m.count}</td>
                    <td className={`px-4 py-2 text-right font-mono ${m.success_rate > 0.9 ? 'text-[var(--success)]' : m.success_rate < 0.7 ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
                      {pct(m.success_rate)}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono ${m.error_rate > 0.2 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                      {pct(m.error_rate)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-[var(--text-muted)]">{m.avg_duration_ms}</td>
                    <td className={`px-4 py-2 text-right font-mono ${m.p95_duration_ms > 5000 ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
                      {m.p95_duration_ms}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recentFeedback.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <SectionHeader label="Последние отзывы" />
          <div className="divide-y divide-[var(--border)]">
            {recentFeedback.map((f, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                {f.rating === 'good'
                  ? <ThumbsUp   className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                  : <ThumbsDown className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />}
                <span className="text-xs font-mono text-[var(--ocean)] w-32 shrink-0 truncate">{f.intent}</span>
                <span className="text-xs text-[var(--text-muted)] flex-1 truncate">{f.comment ?? '—'}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">{fmtTime(f.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Experiments Tab ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  running: 'Идёт', paused: 'Пауза', completed: 'Завершён',
};

function ExperimentsTab() {
  const [data, setData]    = useState<Experiment[] | null>(null);
  const [loading, setLoad] = useState(true);
  const [error, setError]  = useState('');
  const [expanded, setEx]  = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, SDKSession[]>>({});
  const [triggering, setTriggering] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoad(true);
    fetch('/api/agents/experiments')
      .then(r => r.json() as Promise<ExperimentsResponse>)
      .then(j => { if (j.success) setData(j.data); else setError('Ошибка загрузки'); })
      .catch(() => setError('Ошибка запроса'))
      .finally(() => setLoad(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadSessions = useCallback(async (experimentId: string) => {
    try {
      const r = await fetch(`/api/agents/experiments/sessions?experiment_id=${experimentId}`);
      const j = await r.json() as { success: boolean; data: SDKSession[] };
      if (j.success) setSessions(prev => ({ ...prev, [experimentId]: j.data }));
    } catch { /* non-critical */ }
  }, []);

  const triggerSDK = useCallback(async (intent: string, expId: string) => {
    setTriggering(expId);
    try {
      const agentId = intent.startsWith('evo') ? 'evo' : intent.startsWith('rescue') ? 'rescue' : 'hacker';
      const r = await fetch('/api/agents/dispatch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agentId, intent, forceSDK: true }),
      });
      const j = await r.json() as { success: boolean; response?: string };
      setTriggerResult(prev => ({ ...prev, [expId]: j.success ? 'SDK запущен' : 'Ошибка' }));
      if (j.success) loadSessions(expId);
    } catch {
      setTriggerResult(prev => ({ ...prev, [expId]: 'Ошибка запроса' }));
    } finally {
      setTriggering(null);
    }
  }, [loadSessions]);

  async function complete(id: string, winner: 'a' | 'b' | 'tie') {
    setCompleting(id);
    await fetch(`/api/agents/experiments?id=${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'completed', winner }),
    });
    load();
    setCompleting(null);
  }

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-[var(--danger)] text-sm p-4">
      <AlertCircle className="w-4 h-4" />{error}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-secondary)]">
          A/B эксперименты: classic-агент (A) vs SDK agentic loop (B). Чётная минута → SDK, нечётная → classic.
        </p>
        <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-0.5 rounded">
          {data?.length ?? 0} экспериментов
        </span>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        {(!data || data.length === 0) && <EmptyState text="Нет экспериментов" />}
        {data && data.length > 0 && (
          <div className="divide-y divide-[var(--border)]">
            {data.map(exp => {
              const isEx = expanded === exp.id;
              const expSessions = sessions[exp.id];
              const classicSess = expSessions?.find(s => s.variant === 'classic');
              const sdkSess     = expSessions?.find(s => s.variant === 'sdk');
              return (
                <div key={exp.id}>
                  <button
                    onClick={() => {
                      setEx(isEx ? null : exp.id);
                      if (!isEx && !expSessions) loadSessions(exp.id);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
                  >
                    {isEx
                      ? <ChevronDown  className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />}
                    <span className="text-xs font-semibold text-[var(--text-primary)] flex-1 truncate">{exp.name}</span>
                    {exp.intent && (
                      <span className="text-[10px] font-mono text-[var(--ocean)] shrink-0">{exp.intent}</span>
                    )}
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                      exp.status === 'running'  ? 'bg-green-100 dark:bg-green-900/30 text-[var(--success)]'
                      : exp.status === 'paused' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-[var(--warning)]'
                      : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                    }`}>{STATUS_LABELS[exp.status] ?? exp.status}</span>
                    {exp.winner && (
                      <span className="text-[10px] font-mono text-[var(--accent)] shrink-0">
                        победитель: {exp.winner}
                      </span>
                    )}
                  </button>
                  {isEx && (
                    <div className="px-10 pb-4 pt-2 space-y-3">
                      {exp.description && (
                        <p className="text-xs text-[var(--text-secondary)]">{exp.description}</p>
                      )}
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Метрика: <span className="font-mono">{exp.metric}</span>
                        {' | '}Создан: <span className="font-mono">{fmtDate(exp.created_at)}</span>
                      </p>

                      {/* A/B варианты */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'A — Classic', desc: String(exp.variant_a?.description ?? ''), sessions: classicSess },
                          { label: 'B — SDK',     desc: String(exp.variant_b?.description ?? ''), sessions: sdkSess },
                        ].map(v => (
                          <div key={v.label} className="bg-[var(--bg-hover)] rounded-md p-2.5 space-y-1">
                            <p className="text-[10px] font-semibold text-[var(--text-primary)]">{v.label}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">{v.desc}</p>
                            {v.sessions ? (
                              <div className="text-[10px] text-[var(--text-muted)] font-mono space-y-0.5">
                                <p>запусков: {v.sessions.count}</p>
                                <p>успех: {Math.round(v.sessions.success_rate * 100)}%</p>
                                {v.sessions.avg_tool_calls > 0 && (
                                  <p>tool calls: {v.sessions.avg_tool_calls.toFixed(1)} avg</p>
                                )}
                                <p>время: {Math.round(v.sessions.avg_duration_ms / 1000)}с avg</p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-[var(--text-muted)]">нет данных</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Кнопки */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {exp.status === 'running' && exp.intent && (
                          <button
                            onClick={() => triggerSDK(exp.intent!, exp.id)}
                            disabled={triggering === exp.id}
                            className="px-3 py-1.5 text-xs font-medium bg-[var(--ocean)] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {triggering === exp.id ? 'Запускаю...' : 'Запустить SDK →'}
                          </button>
                        )}
                        {triggerResult[exp.id] && (
                          <span className="text-[10px] text-[var(--success)] self-center">{triggerResult[exp.id]}</span>
                        )}
                        {exp.status === 'running' && (
                          <>
                            {(['a', 'b', 'tie'] as const).map(w => (
                              <button
                                key={w}
                                onClick={() => complete(exp.id, w)}
                                disabled={completing === exp.id}
                                className="px-3 py-1.5 text-xs bg-[var(--bg-hover)] border border-[var(--border)] rounded-md hover:bg-[var(--accent)] hover:text-white hover:border-transparent transition-colors disabled:opacity-50"
                              >
                                Победитель: {w}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Approvals Tab ─────────────────────────────────────────────────────────────

interface ExecLogEntry {
  actor: string;
  event_type: string;
  message: string;
  created_at?: string;
}

function ExecutionLogDrawer({ approvalId, onClose }: { approvalId: string; onClose: () => void }) {
  const [log,     setLog]     = useState<ExecLogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [status,  setStatus]  = useState<string | null>(null);

  // Load stored log on open
  useEffect(() => {
    fetch(`/api/agents/execute/${approvalId}`)
      .then(r => r.json() as Promise<{ success: boolean; log: ExecLogEntry[]; status: { execution_status: string } | null }>)
      .then(j => {
        if (j.success) {
          setLog(j.log ?? []);
          setStatus(j.status?.execution_status ?? null);
        }
      })
      .catch(() => null);
  }, [approvalId]);

  async function triggerExecution() {
    setRunning(true);
    setLog([]);
    try {
      const resp = await fetch(`/api/agents/execute/${approvalId}`, { method: 'POST' });
      if (!resp.ok || !resp.body) {
        setLog([{ actor: 'system', event_type: 'failed', message: `HTTP ${resp.status}` }]);
        return;
      }
      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let   buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6)) as { type: string; event_type?: string; message?: string; error?: string };
            if (evt.type === 'step') {
              setLog(prev => [...prev, { actor: 'executor', event_type: evt.event_type ?? 'progress', message: evt.message ?? '' }]);
            } else if (evt.type === 'done' || evt.type === 'failed') {
              setStatus(evt.type === 'done' ? 'done' : 'failed');
              setLog(prev => [...prev, { actor: 'system', event_type: evt.type, message: evt.type === 'done' ? 'Исполнение завершено' : (evt.error ?? 'Ошибка') }]);
            } else if (evt.type === 'started') {
              setStatus('in_progress');
              setLog(prev => [...prev, { actor: 'system', event_type: 'started', message: `Запущен исполнитель: ${(evt as Record<string, string>).executor ?? ''} [${(evt as Record<string, string>).action_type ?? ''}]` }]);
            }
          } catch { /* ignore parse error */ }
        }
      }
    } finally {
      setRunning(false);
    }
  }

  const statusColor: Record<string, string> = {
    started:   'var(--ocean)',
    progress:  'var(--text-secondary)',
    completed: 'var(--success)',
    done:      'var(--success)',
    failed:    'var(--danger)',
    warning:   'var(--warning)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Лог исполнения</span>
            {status && <ExecStatusBadge status={status} />}
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Log entries */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[11px] bg-[var(--bg-primary)]">
          {log.length === 0 && !running && (
            <p className="text-[var(--text-muted)] text-center py-6">Нет записей в логе</p>
          )}
          {log.map((entry, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[var(--text-muted)] shrink-0 text-[10px]">[{String(i + 1).padStart(2, '0')}]</span>
              <span style={{ color: statusColor[entry.event_type] ?? 'var(--text-secondary)' }} className="uppercase text-[9px] shrink-0 w-16">{entry.event_type}</span>
              <span className="text-[var(--text-primary)] break-all">{entry.message}</span>
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-2 text-[var(--warning)] py-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Выполняется...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] flex gap-2">
          {(!status || status === 'pending' || status === 'assigned') && (
            <button onClick={() => void triggerExecution()} disabled={running}
              className="ds-btn ds-btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 disabled:opacity-50">
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              {running ? 'Запуск...' : 'Запустить'}
            </button>
          )}
          <button onClick={onClose} className="ds-btn text-xs py-1.5 px-4">Закрыть</button>
        </div>
      </div>
    </div>
  );
}


const BOARD_AGENTS = [
  { id: 'admin',    label: 'AI Администратор' },
  { id: 'legal',    label: 'AI Юрист'         },
  { id: 'security', label: 'AI Безопасность'  },
  { id: 'hacker',   label: 'AI Хакер'         },
  { id: 'rescue',   label: 'AI Спасатель'     },
  { id: 'eco',      label: 'AI Эколог'        },
  { id: 'content',  label: 'AI Аудитор'       },
  { id: 'quality',  label: 'AI Качество'      },
  { id: 'planning', label: 'AI Планировщик'   },
  { id: 'evo',      label: 'AI Эволюция'      },
];

const EXEC_STATUS_LABELS: Record<string, string> = {
  pending:     'Ожидает',
  assigned:    'Назначен',
  in_progress: 'В работе',
  done:        'Выполнено',
  failed:      'Ошибка',
};

function ExecStatusBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') return null;
  const colors: Record<string, string> = {
    assigned:    'var(--ocean)',
    in_progress: 'var(--warning)',
    done:        'var(--success)',
    failed:      'var(--danger)',
  };
  const color = colors[status] ?? 'var(--text-muted)';
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
      style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
      {EXEC_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ApprovalsTab() {
  const [data,     setData]    = useState<Approval[] | null>(null);
  const [loading,  setLoad]    = useState(true);
  const [error,    setError]   = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [section,  setSection] = useState<'pending' | 'tracking'>('pending');
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoad(true);
    fetch('/api/agents/approvals?status=all')
      .then(r => r.json() as Promise<ApprovalsResponse>)
      .then(j => { if (j.success) setData(j.data); else setError('Ошибка загрузки'); })
      .catch(() => setError('Ошибка запроса'))
      .finally(() => setLoad(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(id: string, action: 'approve' | 'reject') {
    setReviewing(id);
    await fetch('/api/agents/approvals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approval_id: id, action }),
    });
    load();
    setReviewing(null);
  }

  async function assignExecutor(approval_id: string, executor_agent_id: string) {
    setAssigning(approval_id);
    const agent = BOARD_AGENTS.find(a => a.id === executor_agent_id);
    await fetch('/api/agents/approvals', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        approval_id,
        executor_agent_id,
        executor_name: agent?.label ?? executor_agent_id,
        execution_status: 'assigned',
      }),
    });
    load();
    setAssigning(null);
  }

  async function updateExecStatus(approval_id: string, execution_status: string) {
    setAssigning(approval_id);
    await fetch('/api/agents/approvals', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ approval_id, execution_status }),
    });
    load();
    setAssigning(null);
  }

  if (loading) return (
    <div className="space-y-3">
      {[1, 2].map(i => <div key={i} className="h-14 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-[var(--danger)] text-sm p-4">
      <AlertCircle className="w-4 h-4" />{error}
    </div>
  );

  const pending  = data?.filter(a => a.status === 'pending')  ?? [];
  const approved = data?.filter(a => a.status === 'approved') ?? [];

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {[
          { id: 'pending'  as const, label: `Ожидают (${pending.length})`,       icon: Clock      },
          { id: 'tracking' as const, label: `В работе (${approved.length})`,      icon: Target     },
        ].map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                section === s.id
                  ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}>
              <Icon className="w-3 h-3" />{s.label}
            </button>
          );
        })}
      </div>

      {/* Pending section */}
      {section === 'pending' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          {pending.length === 0 && <EmptyState text="Нет ожидающих запросов" />}
          {pending.length > 0 && (
            <div className="divide-y divide-[var(--border)]">
              {pending.map(ap => (
                <div key={ap.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{ap.action_type}</p>
                      {ap.topic && (
                        <p className="text-[10px] text-[var(--ocean)] mt-0.5 font-medium">Тема: {ap.topic}</p>
                      )}
                      {ap.description && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{ap.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {ap.requested_by && (
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">от: {ap.requested_by}</span>
                        )}
                        {ap.expires_at && (
                          <span className="flex items-center gap-0.5 text-[10px] font-mono text-[var(--warning)]">
                            <Clock className="w-2.5 h-2.5" />{fmtDate(ap.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => review(ap.id, 'approve')}
                        disabled={reviewing === ap.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-[var(--success)] rounded-md hover:opacity-80 transition-opacity disabled:opacity-50"
                      >
                        <CheckCircle className="w-3 h-3" />Одобрить
                      </button>
                      <button
                        onClick={() => review(ap.id, 'reject')}
                        disabled={reviewing === ap.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-[var(--danger)] rounded-md hover:opacity-80 transition-opacity disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" />Отклонить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tracking section */}
      {section === 'tracking' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          {approved.length === 0 && <EmptyState text="Нет одобренных инициатив" />}
          {approved.length > 0 && (
            <div className="divide-y divide-[var(--border)]">
              {approved.map(ap => (
                <div key={ap.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{ap.action_type}</p>
                        <ExecStatusBadge status={ap.execution_status} />
                      </div>
                      {ap.topic && (
                        <p className="text-[10px] text-[var(--ocean)] mt-0.5 font-medium">Тема: {ap.topic}</p>
                      )}
                      {ap.description && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{ap.description}</p>
                      )}
                      {ap.executor_name && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--text-secondary)]">
                          <UserCheck className="w-3 h-3" />
                          Исполнитель: <span className="font-medium">{ap.executor_name}</span>
                        </div>
                      )}
                      {ap.execution_notes && (
                        <p className="text-[10px] text-[var(--text-muted)] italic mt-0.5">{ap.execution_notes}</p>
                      )}
                      <span className="text-[9px] text-[var(--text-muted)] font-mono">{fmtDate(ap.created_at)}</span>
                    </div>
                    {/* Log open button */}
                    <button onClick={() => setOpenLogId(ap.id)}
                      className="shrink-0 flex items-center gap-1 text-[10px] text-[var(--ocean)] hover:text-[var(--accent)] transition-colors">
                      <Terminal className="w-3 h-3" />
                      Лог
                    </button>
                  </div>

                  {/* Executor assignment */}
                  {!ap.executor_agent_id && (
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <select
                        defaultValue=""
                        disabled={assigning === ap.id}
                        onChange={e => { if (e.target.value) void assignExecutor(ap.id, e.target.value); }}
                        className="ds-input text-xs py-1 flex-1 max-w-[200px]"
                      >
                        <option value="" disabled>Назначить исполнителя...</option>
                        {BOARD_AGENTS.map(a => (
                          <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                      </select>
                      {assigning === ap.id && <Loader2 className="w-3 h-3 animate-spin text-[var(--text-muted)]" />}
                    </div>
                  )}

                  {/* Status controls */}
                  {ap.executor_agent_id && ap.execution_status !== 'done' && ap.execution_status !== 'failed' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-[var(--text-muted)]">Статус:</span>
                      {(['in_progress', 'done', 'failed'] as const).map(s => (
                        ap.execution_status !== s && (
                          <button key={s}
                            disabled={assigning === ap.id}
                            onClick={() => void updateExecStatus(ap.id, s)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors disabled:opacity-50 ${
                              s === 'done'       ? 'text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]' :
                              s === 'failed'     ? 'text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]' :
                                                   'text-[var(--ocean)] border-[color-mix(in_srgb,var(--ocean)_30%,transparent)]'
                            }`}>
                            {EXEC_STATUS_LABELS[s]}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Execution Log Drawer */}
      {openLogId && (
        <ExecutionLogDrawer
          approvalId={openLogId}
          onClose={() => { setOpenLogId(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Agent Registry ────────────────────────────────────────────────────────────

interface AgentDef {
  id: string;
  name: string;
  role: string;
  persona: string;
  skills: string[];
  icon: LucideIcon;
  color: string;
  source: string;
}

const AGENT_REGISTRY: AgentDef[] = [
  {
    id: 'admin', name: 'AI Администратор', role: 'Операционный директор',
    persona: 'Отвечает за общую работоспособность платформы. Сводки, лиды, здоровье системы.',
    skills: ['admin_digest', 'admin_health', 'admin_leads'],
    icon: Shield, color: 'var(--accent)', source: 'admin-agency.ts',
  },
  {
    id: 'operator', name: 'AI Оператор', role: 'Менеджер операторов',
    persona: 'Управляет турами, бронированиями и доходами операторов. Создаёт туры и слоты.',
    skills: ['op_tours_summary', 'op_bookings_today', 'op_revenue', 'op_create_tour', 'op_fill_ai', 'op_add_slots'],
    icon: Zap, color: 'var(--ocean)', source: 'operator-agency.ts',
  },
  {
    id: 'tourist', name: 'AI Гид', role: 'Рекомендации туристам',
    persona: 'Парсит интересы из текста, подбирает маршруты на Камчатке.',
    skills: ['tourist_recommend'],
    icon: Star, color: '#F59E0B', source: 'tourist-agency.ts',
  },
  {
    id: 'legal', name: 'AI Юрист', role: 'Юрисконсульт',
    persona: 'Проверяет договоры, compliance, юридические риски бронирований.',
    skills: ['legal_contract', 'legal_compliance', 'legal_risks'],
    icon: Scale, color: '#8B5CF6', source: 'legal-agency.ts',
  },
  {
    id: 'security', name: 'AI Безопасность', role: 'Руководитель безопасности',
    persona: 'Мониторит угрозы, аномалии, подозрительную активность.',
    skills: ['sec_access_audit', 'sec_anomaly', 'sec_report'],
    icon: Lock, color: 'var(--danger)', source: 'security-agency.ts',
  },
  {
    id: 'hacker', name: 'AI Хакер', role: 'Директор по росту',
    persona: 'Growth hacker: конверсия, воронка, автоматизация. Ищет точки роста.',
    skills: ['hack_growth', 'hack_funnel', 'hack_automate'],
    icon: TrendingUp, color: 'var(--success)', source: 'hacker-agency.ts',
  },
  {
    id: 'rescue', name: 'AI Спасатель', role: 'Начальник SAR',
    persona: 'SOS-мониторинг, погодные риски для туристов, экстренные протоколы.',
    skills: ['rescue_sos_stats', 'rescue_weather_risk', 'rescue_protocols'],
    icon: Binoculars, color: 'var(--warning)', source: 'rescue-agency.ts',
  },
  {
    id: 'eco', name: 'AI Эколог', role: 'Эколог-аналитик',
    persona: 'Нагрузка на природу Камчатки, охраняемые зоны, eco-score.',
    skills: ['eco_impact', 'eco_zones'],
    icon: Leaf, color: '#10B981', source: 'eco-agency.ts',
  },
  {
    id: 'content', name: 'AI Аудитор', role: 'Контент-директор',
    persona: 'Качество контента туров: описания, фото, цены, полнота.',
    skills: ['content_audit', 'content_flag'],
    icon: FileSearch, color: 'var(--ocean)', source: 'content-auditor-agency.ts',
  },
  {
    id: 'marketing', name: 'AI Маркетолог', role: 'Директор маркетинга',
    persona: 'Трафик, источники, контент-план для Telegram-канала.',
    skills: ['mkt_performance', 'mkt_content_plan'],
    icon: Megaphone, color: '#EC4899', source: 'marketing-agency.ts',
  },
  {
    id: 'planning', name: 'AI Планировщик', role: 'Стратег',
    persona: 'Прогнозы бронирований, сезонность, дефицит туров.',
    skills: ['plan_forecast', 'plan_season', 'plan_gaps'],
    icon: CalendarDays, color: '#6366F1', source: 'planning-agency.ts',
  },
  {
    id: 'quality', name: 'AI Качество', role: 'Директор по качеству',
    persona: 'Отзывы, рейтинги, здоровье операторов, туры без слотов.',
    skills: ['qa_reviews', 'qa_slots', 'qa_operators'],
    icon: BarChart3, color: '#F59E0B', source: 'quality-agency.ts',
  },
  {
    id: 'evo', name: 'AI Эволюция', role: 'Архитектор платформы',
    persona: 'Самоанализ AI-системы. Запускает A/B-тесты, адаптируется по фидбеку.',
    skills: ['evo_optimize', 'evo_experiments', 'evo_adapt'],
    icon: Cpu, color: '#EC4899', source: 'evolution-agency.ts',
  },
];

function RegistryTab({ hours }: { hours: number }) {
  const [metrics, setMetrics] = useState<IntentMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agents/insights?hours=${hours}`)
      .then(r => r.json())
      .then((j: InsightsResponse) => {
        if (j.success && j.data?.metrics) setMetrics(j.data.metrics);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hours]);

  const getAgentHealth = (agent: AgentDef) => {
    const matched = metrics.filter(m => agent.skills.includes(m.intent));
    if (matched.length === 0) return null;
    const totalCalls = matched.reduce((s, m) => s + m.count, 0);
    const avgSuccess = matched.reduce((s, m) => s + m.success_rate * m.count, 0) / (totalCalls || 1);
    const avgDuration = matched.reduce((s, m) => s + m.avg_duration_ms * m.count, 0) / (totalCalls || 1);
    return { totalCalls, avgSuccess, avgDuration };
  };

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader label={`Реестр агентов (${AGENT_REGISTRY.length})`} />
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {AGENT_REGISTRY.map(agent => {
          const Icon = agent.icon;
          const health = getAgentHealth(agent);
          return (
            <div key={agent.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${agent.color}20`, border: `1px solid ${agent.color}35` }}
                >
                  <Icon size={15} style={{ color: agent.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">{agent.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{agent.role}</div>
                </div>
                {health && (
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-mono font-bold ${
                      health.avgSuccess >= 0.9 ? 'text-[var(--success)]'
                        : health.avgSuccess >= 0.7 ? 'text-[var(--warning)]'
                        : 'text-[var(--danger)]'
                    }`}>
                      {Math.round(health.avgSuccess * 100)}%
                    </div>
                    <div className="text-[9px] text-[var(--text-muted)]">{health.totalCalls} вызовов</div>
                  </div>
                )}
              </div>

              {/* Persona */}
              <p className="text-[10px] text-[var(--text-secondary)] mb-2 leading-relaxed">{agent.persona}</p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1">
                {agent.skills.map(s => (
                  <span
                    key={s}
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                    style={{ background: `${agent.color}12`, color: agent.color, border: `1px solid ${agent.color}25` }}
                  >
                    {s}
                  </span>
                ))}
              </div>

              {/* Health bar */}
              {health && (
                <div className="mt-2 flex items-center gap-2 text-[9px] text-[var(--text-muted)]">
                  <div className="flex-1 h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(health.avgSuccess * 100)}%`,
                        background: health.avgSuccess >= 0.9 ? 'var(--success)' : health.avgSuccess >= 0.7 ? 'var(--warning)' : 'var(--danger)',
                      }}
                    />
                  </div>
                  <span>{Math.round(health.avgDuration)}ms</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Source references */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]">
        <div className="text-[10px] text-[var(--text-muted)] space-y-0.5">
          <div className="font-bold mb-1">Архитектура (вдохновители):</div>
          <div>GitAgent — agent.yaml + SOUL.md + skills/ (git-native стандарт)</div>
          <div>OpenViking — unified context (память + навыки + ресурсы)</div>
          <div>MiroFish — роевой интеллект, параллельные агенты</div>
          <div>Ship Safe — 16 параллельных агентов безопасности</div>
          <div>DeepAgents — планирование + порождение сабагентов</div>
          <div>Claude Use Cases — analysis, legal, marketing, coding</div>
        </div>
      </div>
    </div>
  );
}

// ── Mesh Tab ──────────────────────────────────────────────────────────────────

interface MeetingLog {
  id: string;
  created_at: string;
  decision: string;
  duration_ms: number;
  payload: { agents_count?: number; ok?: number; reactions_count?: number };
}

function MeshTab() {
  const [meetings, setMeetings] = useState<MeetingLog[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/agents/activity?hours=168&limit=50')
      .then(r => r.json())
      .then((j: ActivityResponse) => {
        if (j.success && j.data) {
          const mtgs = j.data
            .filter(o => o.metadata.intent === 'board_meeting' && o.metadata.decision?.startsWith('mtg_'))
            .map(o => ({
              id:          o.id,
              created_at:  o.created_at,
              decision:    o.metadata.decision ?? '',
              duration_ms: o.metadata.duration_ms ?? 0,
              payload:     {} as MeetingLog['payload'],
            }));
          setMeetings(mtgs);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Agent connections (based on mesh agent-mesh.ts interests)
  const CONNECTIONS: { from: string; to: string; reason: string }[] = [
    { from: 'legal',    to: 'security', reason: 'Аномалии = юридическая ответственность' },
    { from: 'legal',    to: 'rescue',   reason: 'Инциденты = ответственность оператора' },
    { from: 'security', to: 'hacker',   reason: 'Новые функции = новая поверхность атак' },
    { from: 'security', to: 'evo',      reason: 'Изменения системы = аудит безопасности' },
    { from: 'hacker',   to: 'legal',    reason: 'Юридические барьеры мешают росту' },
    { from: 'hacker',   to: 'quality',  reason: 'Качество = конверсия' },
    { from: 'eco',      to: 'planning', reason: 'Квоты ограничивают объём туров' },
    { from: 'eco',      to: 'rescue',   reason: 'Заповедные зоны = зоны риска' },
    { from: 'rescue',   to: 'eco',      reason: 'Спасательные операции в природе' },
    { from: 'evo',      to: 'admin',    reason: 'Системные улучшения → отчёт директору' },
    { from: 'content',  to: 'marketing',reason: 'Контент питает маркетинг' },
    { from: 'quality',  to: 'content',  reason: 'Плохой контент = плохое качество' },
    { from: 'planning', to: 'hacker',   reason: 'Прогнозы → точки роста' },
  ];

  const agentById = (id: string) => AGENT_REGISTRY.find(a => a.id === id);

  return (
    <div className="pt-3">
      {/* Board meeting section */}
      <SectionHeader label="Совещания (Board Meeting)" />
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              3-раундовый протокол межагентного взаимодействия
            </span>
          </div>
          <a
            href="/hub/admin/board-meeting"
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
          >
            Открыть совещание <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { n: '1', label: 'Отчёты', hint: '9 агентов параллельно' },
            { n: '2', label: 'Реакции', hint: 'Читают чужие отчёты' },
            { n: '3', label: 'Консенсус', hint: 'Синтез + конфликты' },
          ].map(s => (
            <div key={s.n} className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
              <div className="text-xs font-bold text-[var(--accent)]">Раунд {s.n}</div>
              <div className="text-[10px] font-bold text-[var(--text-primary)]">{s.label}</div>
              <div className="text-[9px] text-[var(--text-muted)]">{s.hint}</div>
            </div>
          ))}
        </div>

        {/* Meeting history */}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" /></div>
        ) : meetings.length > 0 ? (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
              Последние совещания ({meetings.length})
            </div>
            {meetings.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-[10px] py-1 border-b border-[var(--border)] last:border-0">
                <CheckCircle className="w-3 h-3 text-[var(--success)] shrink-0" />
                <span className="font-mono text-[var(--text-secondary)]">{m.decision}</span>
                <span className="text-[var(--text-muted)]">{fmtDate(m.created_at)}</span>
                <span className="text-[var(--text-muted)] ml-auto">{(m.duration_ms / 1000).toFixed(1)}с</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Совещаний пока не проводилось" />
        )}
      </div>

      {/* Agent connections */}
      <SectionHeader label={`Межагентные связи (${CONNECTIONS.length})`} />
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
        <div className="space-y-1.5">
          {CONNECTIONS.map((c, i) => {
            const from = agentById(c.from);
            const to   = agentById(c.to);
            if (!from || !to) return null;
            const FromIcon = from.icon;
            const ToIcon   = to.icon;
            return (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <div className="flex items-center gap-1 shrink-0" style={{ color: from.color }}>
                  <FromIcon size={11} />
                  <span className="font-bold">{from.name.replace('AI ', '')}</span>
                </div>
                <div className="text-[var(--text-muted)]">→</div>
                <div className="flex items-center gap-1 shrink-0" style={{ color: to.color }}>
                  <ToIcon size={11} />
                  <span className="font-bold">{to.name.replace('AI ', '')}</span>
                </div>
                <span className="text-[var(--text-muted)] truncate ml-1">— {c.reason}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capabilities summary */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Всего агентов',    value: String(AGENT_REGISTRY.length), color: 'var(--accent)' },
          { label: 'Интентов',         value: String(AGENT_REGISTRY.reduce((s, a) => s + a.skills.length, 0)), color: 'var(--ocean)' },
          { label: 'Межагентных связей', value: String(CONNECTIONS.length), color: 'var(--success)' },
          { label: 'Раунды совещания', value: '3',                          color: 'var(--warning)' },
        ].map(m => (
          <div key={m.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-center">
            <div className="font-mono text-lg font-bold" style={{ color: m.color }}>{m.value}</div>
            <div className="text-[9px] text-[var(--text-muted)] uppercase">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'registry',    label: 'Реестр',       icon: Brain        },
  { id: 'mesh',        label: 'Mesh',         icon: Network      },
  { id: 'activity',    label: 'Активность',   icon: Activity     },
  { id: 'insights',    label: 'Аналитика',    icon: TrendingUp   },
  { id: 'experiments', label: 'Эксперименты', icon: FlaskConical },
  { id: 'approvals',   label: 'Одобрения',    icon: ShieldCheck  },
];

export default function AgentsClient() {
  const [tab,       setTab]      = useState<Tab>('registry');
  const [data,      setData]     = useState<ActivityResponse | null>(null);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState('');
  const [hours,     setHours]    = useState(24);
  const [expanded,  setExpanded] = useState<string | null>(null);

  const [message,     setMessage]     = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchRes, setDispatchRes] = useState<DispatchResponse | null>(null);

  const fetchActivity = useCallback(async (h = hours) => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/agents/activity?hours=${h}&limit=100`);
      const json = await res.json() as ActivityResponse;
      if (!json.success) throw new Error('Ошибка загрузки');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  async function handleDispatch() {
    if (!message.trim()) return;
    setDispatching(true);
    setDispatchRes(null);
    try {
      const res  = await fetch('/api/agents/dispatch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      const json = await res.json() as DispatchResponse;
      setDispatchRes(json);
      if (json.success) { setMessage(''); fetchActivity(hours); }
    } catch {
      setDispatchRes({ success: false, intent: 'unknown', response: 'Ошибка запроса', duration_ms: 0 });
    } finally {
      setDispatching(false);
    }
  }

  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    fetch('/api/agents/approvals')
      .then(r => r.json() as Promise<ApprovalsResponse>)
      .then(j => { if (j.success) setPendingCount(j.total); })
      .catch(() => null);
  }, []);

  return (
    <div className="p-5 lg:p-6 space-y-4 max-w-5xl">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Brain className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Агенты AI</h1>
          <span className="text-xs text-[var(--text-muted)] font-mono">{hours}ч</span>
        </div>
        <div className="flex items-center gap-2">
          {[6, 24, 72].map(h => (
            <button
              key={h}
              onClick={() => { setHours(h); fetchActivity(h); }}
              className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                h === hours
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
              }`}
            >{h}ч</button>
          ))}
          <button
            onClick={() => fetchActivity()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.id === 'approvals' && pendingCount > 0 && (
                <span className="ml-0.5 bg-[var(--danger)] text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'registry' && <RegistryTab hours={hours} />}
      {tab === 'mesh'     && <MeshTab />}
      {tab === 'activity' && (
        <ActivityTab
          data={data} loading={loading} error={error}
          hours={hours} fetchActivity={fetchActivity}
          expanded={expanded} setExpanded={setExpanded}
          message={message} setMessage={setMessage}
          dispatching={dispatching} dispatchRes={dispatchRes}
          handleDispatch={handleDispatch}
        />
      )}
      {tab === 'insights'    && <InsightsTab hours={hours} />}
      {tab === 'experiments' && <ExperimentsTab />}
      {tab === 'approvals'   && <ApprovalsTab />}

    </div>
  );
}
