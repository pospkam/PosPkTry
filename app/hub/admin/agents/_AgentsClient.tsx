'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain, RefreshCw, AlertCircle, CheckCircle, XCircle,
  Clock, Zap, Play, ChevronDown, ChevronRight, FlaskConical,
  ShieldCheck, TrendingUp, ThumbsUp, ThumbsDown, Activity,
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
  status: 'running' | 'paused' | 'completed';
  winner: 'a' | 'b' | 'tie' | null;
  metric: string;
  created_at: string;
}

interface ExperimentsResponse { success: boolean; data: Experiment[] }

interface Approval {
  id: string;
  action_type: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requested_by: string | null;
  expires_at: string | null;
  created_at: string;
}

interface ApprovalsResponse { success: boolean; data: Approval[]; total: number }

type Tab = 'activity' | 'insights' | 'experiments' | 'approvals';

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
            <div dangerouslySetInnerHTML={{ __html: dispatchRes.response.replace(/\n/g, '<br/>') }} />
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

  const load = useCallback(() => {
    setLoad(true);
    fetch('/api/agents/experiments')
      .then(r => r.json() as Promise<ExperimentsResponse>)
      .then(j => { if (j.success) setData(j.data); else setError('Ошибка загрузки'); })
      .catch(() => setError('Ошибка запроса'))
      .finally(() => setLoad(false));
  }, []);

  useEffect(() => { load(); }, [load]);

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
      {[1, 2].map(i => <div key={i} className="h-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-[var(--danger)] text-sm p-4">
      <AlertCircle className="w-4 h-4" />{error}
    </div>
  );

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <SectionHeader label={`Эксперименты A/B (${data?.length ?? 0})`} />
      {(!data || data.length === 0) && <EmptyState text="Нет экспериментов" />}
      {data && data.length > 0 && (
        <div className="divide-y divide-[var(--border)]">
          {data.map(exp => {
            const isEx = expanded === exp.id;
            return (
              <div key={exp.id}>
                <button
                  onClick={() => setEx(isEx ? null : exp.id)}
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
                  <div className="px-10 pb-4 pt-1 space-y-3">
                    {exp.description && (
                      <p className="text-xs text-[var(--text-secondary)]">{exp.description}</p>
                    )}
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Метрика: <span className="font-mono">{exp.metric}</span>
                      {' | '}Создан: <span className="font-mono">{fmtDate(exp.created_at)}</span>
                    </p>
                    {exp.status === 'running' && (
                      <div className="flex flex-wrap gap-2">
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Approvals Tab ─────────────────────────────────────────────────────────────

function ApprovalsTab() {
  const [data, setData]    = useState<Approval[] | null>(null);
  const [loading, setLoad] = useState(true);
  const [error, setError]  = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoad(true);
    fetch('/api/agents/approvals')
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

  const pending = data?.filter(a => a.status === 'pending') ?? [];

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <SectionHeader label={`Ожидают одобрения (${pending.length})`} />
      {pending.length === 0 && <EmptyState text="Нет ожидающих запросов" />}
      {pending.length > 0 && (
        <div className="divide-y divide-[var(--border)]">
          {pending.map(ap => (
            <div key={ap.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{ap.action_type}</p>
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
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'activity',    label: 'Активность',   icon: Activity     },
  { id: 'insights',    label: 'Аналитика',    icon: TrendingUp   },
  { id: 'experiments', label: 'Эксперименты', icon: FlaskConical },
  { id: 'approvals',   label: 'Одобрения',    icon: ShieldCheck  },
];

export default function AgentsClient() {
  const [tab,       setTab]      = useState<Tab>('activity');
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
