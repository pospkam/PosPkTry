'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, Play, Bot, Zap, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AgentDef {
  id: string;
  name: string;
  description: string;
  schedule: string;
}

const AGENTS: AgentDef[] = [
  {
    id: 'watchdog',
    name: 'Watchdog',
    description: 'Мониторинг: бронирования без подтверждения, операторы без ответа, лиды, SOS.',
    schedule: 'каждые 30 мин',
  },
  {
    id: 'editor',
    name: 'Editor',
    description: 'AI-редактор: находит туры с короткими описаниями → переписывает через AI.',
    schedule: 'раз в сутки (02:00 UTC)',
  },
  {
    id: 'scout-digest',
    name: 'Scout Digest',
    description: 'Дайджест: RSS AI/тревел/Камчатка → AI-синтез → Telegram.',
    schedule: 'раз в сутки (07:00 UTC)',
  },
  {
    id: 'intelligence',
    name: 'Intelligence Monitor',
    description: 'Сбор AI/тревел/конкурент сигналов из RSS и поиска → в Brain.',
    schedule: 'каждые 6 часов',
  },
  {
    id: 'scout',
    name: 'Scout-Innovator',
    description: 'Читает Brain → платформу → 2-3 конкретных предложения → Telegram.',
    schedule: 'раз в сутки (06:00 UTC)',
  },
  {
    id: 'evo',
    name: 'Evo System',
    description: 'Growth Scan + Evolution Loop + Rescue. Сканирует код → находит проблемы → применяет фиксы.',
    schedule: 'каждые 6 часов',
  },
  {
    id: 'rescue',
    name: 'Rescue',
    description: 'SOS без ответа, погодные угрозы, бронирования без подтверждения, операторы без ответа.',
    schedule: 'каждые 30 мин',
  },
];

interface RunSummary {
  agent_id: string;
  status: string;
  started_at: string;
}

interface RunRow {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  items_processed: number | null;
  errors_count: number;
  error_msg: string | null;
}

interface TriggerState {
  loading: boolean;
  result: Record<string, unknown> | null;
  error: string | null;
}

function StatusDot({ status }: { status?: string }) {
  if (!status) return <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] inline-block" />;
  if (status === 'success') return <span className="w-2 h-2 rounded-full bg-[var(--success)] inline-block" />;
  if (status === 'partial') return <span className="w-2 h-2 rounded-full bg-[var(--warning)] inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-[var(--danger)] inline-block" />;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'success'
      ? 'text-[var(--success)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)]'
      : status === 'partial'
      ? 'text-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)]'
      : 'text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${cls}`}>
      {status === 'success' ? 'OK' : status === 'partial' ? 'частично' : 'ошибка'}
    </span>
  );
}

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}мс`;
  return `${(ms / 1000).toFixed(1)}с`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AgentsClient() {
  const [summary, setSummary] = useState<Record<string, RunSummary>>({});
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggers, setTriggers] = useState<Record<string, TriggerState>>({});

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agents/runs?limit=30');
      if (!res.ok) return;
      const data = await res.json() as { runs: RunRow[]; summary: RunSummary[] };
      setRuns(data.runs);
      const map: Record<string, RunSummary> = {};
      for (const s of data.summary) map[s.agent_id] = s;
      setSummary(map);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    const interval = setInterval(() => void loadHistory(), 30_000);
    return () => clearInterval(interval);
  }, [loadHistory]);

  async function triggerAgent(agentId: string) {
    setTriggers(prev => ({ ...prev, [agentId]: { loading: true, result: null, error: null } }));
    try {
      const res = await fetch('/api/admin/agents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      const data = await res.json() as { ok: boolean; result?: Record<string, unknown>; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Ошибка');
      setTriggers(prev => ({ ...prev, [agentId]: { loading: false, result: data.result ?? {}, error: null } }));
      void loadHistory();
    } catch (err) {
      setTriggers(prev => ({
        ...prev,
        [agentId]: { loading: false, result: null, error: err instanceof Error ? err.message : 'Ошибка' },
      }));
    }
  }

  return (
    <div className="ds-page max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="ds-h1 mb-1">AI и автоматизации</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Фоновые агенты: мониторинг, контент, разведка. Статус обновляется каждые 30 секунд.
        </p>
      </div>

      {/* Kuzmich card */}
      <div className="ds-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-[var(--accent)] flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Основной AI</p>
              <h2 className="font-semibold text-[var(--text-primary)]">Кузьмич</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                AI-консьерж для туристов и операторов. Telegram, web, виджет.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/kuzmich" className="ds-btn ds-btn-secondary text-sm">Открыть</a>
            <a href="/hub/admin/ai-analytics" className="ds-btn ds-btn-secondary text-sm">Аналитика</a>
          </div>
        </div>
      </div>

      {/* Agent cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Фоновые агенты
        </h2>
        {AGENTS.map(agent => {
          const last = summary[agent.id];
          const trig = triggers[agent.id];
          return (
            <div key={agent.id} className="ds-card p-4">
              <div className="flex items-start gap-4 justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1.5">
                    <StatusDot status={last?.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-medium text-[var(--text-primary)]">{agent.name}</span>
                      <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-0.5 rounded">
                        {agent.schedule}
                      </span>
                      {last && <StatusBadge status={last.status} />}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{agent.description}</p>
                    {last && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Последний запуск: {formatTime(last.started_at)}
                      </p>
                    )}
                    {trig?.result && (
                      <div className="mt-2 text-xs bg-[var(--bg-hover)] rounded p-2 font-mono text-[var(--text-secondary)]">
                        {Object.entries(trig.result).map(([k, v]) => (
                          <div key={k}>{k}: <span className="text-[var(--text-primary)]">{String(v)}</span></div>
                        ))}
                      </div>
                    )}
                    {trig?.error && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--danger)] mt-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {trig.error}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void triggerAgent(agent.id)}
                  disabled={trig?.loading}
                  className="ds-btn ds-btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  {trig?.loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {trig?.loading ? 'Запуск...' : 'Запустить'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Run history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            История запусков
          </h2>
          <button
            onClick={() => void loadHistory()}
            className="text-xs text-[var(--text-muted)] flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Обновить
          </button>
        </div>

        {loading ? (
          <div className="ds-card p-8 text-center text-sm text-[var(--text-muted)]">
            Загрузка...
          </div>
        ) : runs.length === 0 ? (
          <div className="ds-card p-8 text-center text-sm text-[var(--text-muted)]">
            История пуста — запусков ещё не было.
            <br />
            <span className="text-xs">Миграция 143 должна быть применена в БД.</span>
          </div>
        ) : (
          <div className="ds-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <th className="text-left px-4 py-2.5 font-medium">Агент</th>
                  <th className="text-left px-4 py-2.5 font-medium">Статус</th>
                  <th className="text-left px-4 py-2.5 font-medium">Время</th>
                  <th className="text-left px-4 py-2.5 font-medium">Длит.</th>
                  <th className="text-left px-4 py-2.5 font-medium">Записей</th>
                  <th className="text-left px-4 py-2.5 font-medium">Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{run.agent_id}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {run.status === 'success' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />
                        ) : run.status === 'partial' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)]" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)]" />
                        )}
                        <StatusBadge status={run.status} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] text-xs">{formatTime(run.started_at)}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] text-xs">{formatDuration(run.duration_ms)}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] text-xs">
                      {run.items_processed ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {run.error_msg ? (
                        <span className="text-[var(--danger)] truncate max-w-[200px] block" title={run.error_msg}>
                          {run.error_msg.slice(0, 60)}{run.error_msg.length > 60 ? '…' : ''}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Channel posts */}
      <ChannelPostsSection />

      {/* Route import */}
      <ImportRoutesSection />

    </div>
  );
}

function ChannelPostsSection() {
  const POSTS = [
    { id: 'kuzmich_route', label: 'Маршрут', desc: 'АИ выбирает маршрут → генерирует описание → публикует в TG + MAX' },
    { id: 'tip', label: 'Совет Кузьмича', desc: 'Полезный совет туристам о Камчатке → TG + MAX' },
    { id: 'sezon', label: 'Сезонный пост', desc: 'Актуальное время года → TG + MAX' },
    { id: 'ai_news', label: 'AI-новость', desc: 'Тестовый пост → TELEGRAM_AI_CHANNEL_ID' },
  ] as const;

  const [states, setStates] = useState<Record<string, { loading: boolean; ok?: boolean; error?: string }>>({});

  async function trigger(id: string) {
    setStates(p => ({ ...p, [id]: { loading: true } }));
    try {
      const res = await fetch('/api/admin/channels/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: id }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      setStates(p => ({ ...p, [id]: { loading: false, ok: data.ok, error: data.error } }));
    } catch (err) {
      setStates(p => ({ ...p, [id]: { loading: false, ok: false, error: err instanceof Error ? err.message : 'Ошибка' } }));
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-2">
        <Send className="w-3.5 h-3.5" />
        Публикации в каналы
      </h2>
      {POSTS.map(p => {
        const s = states[p.id];
        return (
          <div key={p.id} className="ds-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] text-sm">{p.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{p.desc}</p>
                {s?.ok === true && (
                  <p className="text-xs text-[var(--success)] flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Опубликовано
                  </p>
                )}
                {s?.error && (
                  <p className="text-xs text-[var(--danger)] flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {s.error}
                  </p>
                )}
              </div>
              <button
                onClick={() => void trigger(p.id)}
                disabled={s?.loading}
                className="ds-btn ds-btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0"
              >
                {s?.loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {s?.loading ? 'Публикую...' : 'Опубликовать'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImportRoutesSection() {
  const [state, setState] = useState<{ loading: boolean; result: string | null; error: string | null }>({
    loading: false, result: null, error: null,
  });

  async function run() {
    setState({ loading: true, result: null, error: null });
    try {
      const res = await fetch('/api/admin/import/visitkamchatka', { method: 'POST' });
      const data = await res.json() as { ok: boolean; inserted?: number; updated?: number; total?: number; error?: string };
      if (data.ok) {
        setState({ loading: false, result: `Импортировано: ${data.inserted} новых, ${data.updated} обновлено (всего ${data.total})`, error: null });
      } else {
        setState({ loading: false, result: null, error: data.error ?? 'Ошибка' });
      }
    } catch (e) {
      setState({ loading: false, result: null, error: e instanceof Error ? e.message : 'Ошибка сети' });
    }
  }

  return (
    <div className="ds-card p-5 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-[var(--text-primary)]">Импорт маршрутов — visitkamchatka.ru</div>
          <div className="text-sm text-[var(--text-secondary)] mt-0.5">
            134 официальных паспорта маршрутов Камчатки → kamchatka_routes + Кузьмич
          </div>
        </div>
        <button
          onClick={run}
          disabled={state.loading}
          className="ds-btn ds-btn-primary text-sm px-4 py-2 disabled:opacity-50"
        >
          {state.loading ? 'Импортирую...' : 'Запустить импорт'}
        </button>
      </div>
      {state.result && (
        <div className="text-sm text-[var(--success)] bg-[var(--success)]/10 rounded px-3 py-2">{state.result}</div>
      )}
      {state.error && (
        <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 rounded px-3 py-2">{state.error}</div>
      )}
    </div>
  );
}