'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Rss, Plus, Trash2, RefreshCw, AlertTriangle, Check, X,
  Play, Clock, Activity, Zap, CheckCircle, XCircle, Send,
  ChevronDown, ChevronRight, Archive, Bot, Flame,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

interface Source {
  id: string;
  url: string;
  source_type: string;
  domain: string;
  label: string;
  search_query: string | null;
  ai_filter: string | null;
  active: boolean;
  last_fetched_at: string | null;
  last_error: string | null;
  fetch_error_count: number;
  created_at: string;
  updated_at: string;
}

interface RunRow {
  id: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  items_processed: number | null;
  items_created: number | null;
  errors_count: number;
  error_msg: string | null;
}

interface Stats {
  sources: { total: number; active: number; errored: number };
  memory: { total: number; last_24h: number };
  domains: Array<{ domain: string; source_count: string; last_fetch: string | null }>;
  runs: RunRow[];
}

const DOMAIN_LABELS: Record<string, string> = {
  ai_tech: 'AI & Tech',
  travel_industry: 'Travel',
  competitors: 'Конкуренты',
};

const DOMAIN_COLORS: Record<string, string> = {
  ai_tech: 'ds-badge bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  travel_industry: 'ds-badge bg-green-50 text-green-700 ring-1 ring-green-200',
  competitors: 'ds-badge bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

type Tab = 'dashboard' | 'sources';

// ── Main Component ──────────────────────────────────────────────────────────

export default function IntelligenceSourcesClient() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="ds-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-h1">Разведка</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Intelligence Monitor — источники, история, тесты
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setTab('dashboard')}
          className={`ds-btn ${tab === 'dashboard' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
        >
          <Activity className="w-4 h-4" /> Дашборд
        </button>
        <button
          onClick={() => setTab('sources')}
          className={`ds-btn ${tab === 'sources' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
        >
          <Rss className="w-4 h-4" /> Источники
        </button>
      </div>

      {tab === 'dashboard' ? <DashboardTab /> : <SourcesTab />}
    </div>
  );
}

// ── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [runResult, setRunResult] = useState<string>('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/intelligence-sources/stats');
      const data = await res.json();
      if (data.success) setStats(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const triggerCycle = async () => {
    setRunning(true);
    setRunResult('');
    try {
      const res = await fetch('/api/admin/intelligence-sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_cycle' }),
      });
      const data = await res.json();
      if (data.success) {
        const r = data.report;
        setRunResult(
          `OK: ${r.raw_signals} сигналов, ${r.findings} findings, ${r.duration_ms}ms`
        );
        loadStats();
      } else {
        setRunResult(`Ошибка: ${data.error}`);
      }
    } catch {
      setRunResult('Сетевая ошибка');
    }
    setRunning(false);
  };

  const publishAINews = async () => {
    setPublishing(true);
    setRunResult('');
    try {
      const res = await fetch('/api/admin/intelligence-sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_ai_news' }),
      });
      const data = await res.json();
      if (data.success) {
        const count = data.published?.length ?? 0;
        setRunResult(
          count > 0
            ? `OK: ${count} AI-пост(ов) опубликовано в канал`
            : `Нет notable/critical AI-новостей для публикации (${data.ai_findings} findings)`
        );
      } else {
        setRunResult(`Ошибка: ${data.error}`);
      }
    } catch {
      setRunResult('Сетевая ошибка');
    }
    setPublishing(false);
  };

  if (loading) {
    return <div className="ds-card p-8 text-center text-[var(--text-muted)]">Загрузка...</div>;
  }

  if (!stats) {
    return <div className="ds-card p-8 text-center text-[var(--danger)]">Ошибка загрузки статистики</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Источников" value={stats.sources.active} suffix={`/ ${stats.sources.total}`} />
        <StatCard label="С ошибками" value={stats.sources.errored} danger={stats.sources.errored > 0} />
        <StatCard label="В памяти" value={stats.memory.total} />
        <StatCard label="За 24ч" value={stats.memory.last_24h} />
        <div className="ds-card p-4 flex flex-col gap-2 justify-center">
          <button
            onClick={triggerCycle}
            disabled={running || publishing}
            className="ds-btn-primary w-full justify-center"
          >
            {running ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Запуск...' : 'Запустить'}
          </button>
          <button
            onClick={publishAINews}
            disabled={publishing || running}
            className="ds-btn-secondary w-full justify-center text-xs"
          >
            {publishing ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {publishing ? 'Публикация...' : 'AI-дайджест'}
          </button>
        </div>
      </div>

      {runResult && (
        <div className={`ds-card p-3 text-sm ${runResult.startsWith('OK') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-[var(--danger)]'}`}>
          {runResult}
        </div>
      )}

      {/* Domain breakdown */}
      <div className="ds-card p-4">
        <h3 className="font-semibold mb-3">Домены</h3>
        <div className="space-y-2">
          {stats.domains.map(d => (
            <div key={d.domain} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={DOMAIN_COLORS[d.domain] ?? ''}>{DOMAIN_LABELS[d.domain] ?? d.domain}</span>
                <span className="text-[var(--text-muted)]">{d.source_count} RSS</span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {d.last_fetch ? `Последний: ${new Date(d.last_fetch).toLocaleString('ru-RU')}` : 'Ещё не запускался'}
              </span>
            </div>
          ))}
          {stats.domains.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">Нет активных доменов. Примените миграцию 144.</p>
          )}
        </div>
      </div>

      {/* Run history */}
      <div className="ds-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">История запусков</h3>
          <button onClick={loadStats} className="ds-btn-secondary text-xs">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        {stats.runs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Нет данных о запусках.</p>
        ) : (
          <div className="space-y-2">
            {stats.runs.map(run => (
              <div key={run.id} className="flex items-center justify-between text-sm py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2">
                  {run.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                  ) : run.status === 'failed' ? (
                    <XCircle className="w-4 h-4 text-[var(--danger)]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
                  )}
                  <span>{new Date(run.started_at).toLocaleString('ru-RU')}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  {run.items_processed != null && <span>{run.items_processed} сигн.</span>}
                  {run.items_created != null && <span>{run.items_created} findings</span>}
                  {run.duration_ms != null && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                  {run.errors_count > 0 && (
                    <span className="text-[var(--danger)]">{run.errors_count} err</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intelligence feed */}
      <IntelligenceFeed onChange={loadStats} />

      {/* RSS test */}
      <RssTestCard />
    </div>
  );
}

// ── Intelligence Feed ──────────────────────────────────────────────

interface FeedActionItem {
  idx: number;
  text: string;
  priority: string;
  done: boolean;
  sent_to_kiloclaw: boolean;
  completed_at?: string;
}

interface FeedEntry {
  id: string;
  key: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  tier: number;
  archived: boolean;
  processed: boolean;
  domain: string | null;
  summary: string | null;
  urgency: string;
  signal_count: number | null;
  action_items: FeedActionItem[];
}

function IntelligenceFeed({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/intelligence-feed?limit=50&tier=${showArchived ? 'all' : 'active'}`);
      const data = await res.json();
      if (data.success) setItems(data.items);
    } catch { /* ignore */ }
    setLoading(false);
  }, [showArchived]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runAction = async (entryId: string, body: Record<string, unknown>, successMsg: string) => {
    const busyKey = `${entryId}:${JSON.stringify(body)}`;
    setBusy(busyKey);
    setFlash('');
    try {
      const res = await fetch(`/api/admin/intelligence-feed/${entryId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setFlash(successMsg);
        await load();
        onChange();
      } else {
        setFlash(`Ошибка: ${data.error}`);
      }
    } catch {
      setFlash('Сетевая ошибка');
    }
    setBusy(null);
    setTimeout(() => setFlash(''), 4000);
  };

  const urgencyStyle = (u: string) => {
    if (u === 'critical') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    if (u === 'high' || u === 'notable') return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    if (u === 'medium') return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
  };

  const urgencyIcon = (u: string) => {
    if (u === 'critical') return <Flame className="w-3.5 h-3.5" />;
    if (u === 'high' || u === 'notable') return <AlertTriangle className="w-3.5 h-3.5" />;
    return <Activity className="w-3.5 h-3.5" />;
  };

  return (
    <div className="ds-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Лента разведки</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-muted)] flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
            />
            Показать архив
          </label>
          <button onClick={load} className="ds-btn-secondary text-xs">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {flash && (
        <div className={`mb-3 text-xs px-3 py-2 rounded ${flash.startsWith('Ошибка') ? 'bg-red-50 text-[var(--danger)]' : 'bg-green-50 text-green-700'}`}>
          {flash}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Загрузка...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Пусто. Нажми «Запустить» выше, чтобы собрать свежие сигналы.</p>
      ) : (
        <div className="space-y-2">
          {items.map(entry => {
            const isOpen = expanded.has(entry.id);
            const total = entry.action_items.length;
            const done = entry.action_items.filter(a => a.done).length;
            return (
              <div key={entry.id} className={`border border-[var(--border)] rounded-lg ${entry.archived ? 'opacity-60' : ''}`}>
                <div
                  className="flex items-start gap-2 p-3 cursor-pointer hover:bg-[var(--surface-hover,transparent)]"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <button className="mt-0.5 text-[var(--text-muted)]">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`ds-badge ${urgencyStyle(entry.urgency)} inline-flex items-center gap-1`}>
                        {urgencyIcon(entry.urgency)}
                        {entry.urgency}
                      </span>
                      {entry.domain && (
                        <span className={DOMAIN_COLORS[entry.domain] ?? 'ds-badge bg-slate-50 text-slate-700'}>
                          {DOMAIN_LABELS[entry.domain] ?? entry.domain}
                        </span>
                      )}
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(entry.created_at).toLocaleString('ru-RU')}
                      </span>
                      {total > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {done}/{total} готово
                        </span>
                      )}
                      {entry.archived && (
                        <span className="ds-badge bg-slate-100 text-slate-600">архив</span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--text-primary)] line-clamp-2">
                      {entry.summary ?? entry.key}
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-3 pb-3 pt-0 space-y-3 border-t border-[var(--border)]">
                    {entry.summary && (
                      <p className="text-sm text-[var(--text-secondary)] mt-3">{entry.summary}</p>
                    )}

                    {entry.action_items.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-[var(--text-muted)]">Action items</div>
                        {entry.action_items.map(item => (
                          <div key={item.idx} className="flex items-start gap-2 text-sm p-2 rounded bg-[var(--surface-muted,transparent)] border border-[var(--border)]">
                            <button
                              onClick={() => runAction(entry.id, { action: 'toggle_done', itemIdx: item.idx }, item.done ? 'Снято' : 'Отмечено как выполненное')}
                              disabled={busy !== null}
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${item.done ? 'bg-green-500 border-green-500 text-white' : 'border-[var(--border)]'}`}
                              title={item.done ? 'Снять галочку' : 'Отметить выполненным'}
                            >
                              {item.done && <Check className="w-3 h-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className={`${item.done ? 'line-through text-[var(--text-muted)]' : ''}`}>
                                {item.text}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                                <span>приоритет: {item.priority}</span>
                                {item.sent_to_kiloclaw && <span className="text-blue-600">✓ отправлено KiloClaw</span>}
                              </div>
                            </div>
                            {!item.done && (
                              <button
                                onClick={() => runAction(entry.id, { action: 'send_to_kiloclaw', itemIdx: item.idx }, 'Отправлено KiloClaw')}
                                disabled={busy !== null}
                                className="ds-btn-secondary text-xs whitespace-nowrap"
                                title="Отправить как задачу в Telegram KiloClaw"
                              >
                                <Bot className="w-3 h-3" />
                                Реализовать
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                      <span className="text-xs text-[var(--text-muted)]">
                        {entry.source ?? '—'} · {entry.key}
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={() => runAction(entry.id, { action: entry.archived ? 'unarchive' : 'archive' }, entry.archived ? 'Восстановлено' : 'Архивировано')}
                        disabled={busy !== null}
                        className="ds-btn-secondary text-xs"
                      >
                        <Archive className="w-3 h-3" />
                        {entry.archived ? 'Вернуть' : 'Архив'}
                      </button>
                    </div>
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

function StatCard({ label, value, suffix, danger }: {
  label: string; value: number; suffix?: string; danger?: boolean;
}) {
  return (
    <div className="ds-card p-4">
      <div className={`text-2xl font-bold ${danger ? 'text-[var(--danger)]' : ''}`}>
        {value}{suffix && <span className="text-sm font-normal text-[var(--text-muted)]"> {suffix}</span>}
      </div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function RssTestCard() {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');

  const testRss = async () => {
    if (!url) return;
    setTesting(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/intelligence-sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_rss', url }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`OK: ${data.format}, ${data.items_found} items, ${data.content_length} bytes`);
      } else {
        setResult(`Ошибка: ${data.error}`);
      }
    } catch {
      setResult('Сетевая ошибка');
    }
    setTesting(false);
  };

  return (
    <div className="ds-card p-4">
      <h3 className="font-semibold mb-3">Тест RSS-фида</h3>
      <div className="flex gap-2">
        <input
          className="ds-input flex-1"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com/rss.xml"
        />
        <button onClick={testRss} disabled={testing || !url} className="ds-btn-secondary">
          <Zap className="w-4 h-4" /> {testing ? '...' : 'Тест'}
        </button>
      </div>
      {result && (
        <p className={`mt-2 text-sm ${result.startsWith('OK') ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {result}
        </p>
      )}
    </div>
  );
}

// ── Sources Tab ─────────────────────────────────────────────────────────────

function SourcesTab() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>('');

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDomain) params.set('domain', filterDomain);
      const res = await fetch(`/api/admin/intelligence-sources?${params}`);
      const data = await res.json();
      if (data.success) {
        setSources(data.sources);
      } else {
        setError(data.error ?? 'Ошибка загрузки');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [filterDomain]);

  useEffect(() => { loadSources(); }, [loadSources]);

  const toggleActive = async (id: string, active: boolean) => {
    await fetch('/api/admin/intelligence-sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    loadSources();
  };

  const deleteSource = async (id: string) => {
    if (!confirm('Деактивировать источник?')) return;
    await fetch(`/api/admin/intelligence-sources?id=${id}`, { method: 'DELETE' });
    loadSources();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterDomain('')}
            className={`ds-btn ${!filterDomain ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
          >
            Все
          </button>
          {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterDomain(key)}
              className={`ds-btn ${filterDomain === key ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={loadSources} className="ds-btn-secondary">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)} className="ds-btn-primary">
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>
      </div>

      {error && (
        <div className="ds-card p-4 border-[var(--danger)] bg-red-50 text-[var(--danger)]">{error}</div>
      )}

      {loading ? (
        <div className="ds-card p-8 text-center text-[var(--text-muted)]">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {sources.map(s => (
            <div key={s.id} className={`ds-card p-4 ${!s.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Rss className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span className="font-medium">{s.label}</span>
                    <span className={DOMAIN_COLORS[s.domain] ?? 'ds-badge'}>
                      {DOMAIN_LABELS[s.domain] ?? s.domain}
                    </span>
                    <span className="ds-badge bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">
                      {s.source_type}
                    </span>
                    {!s.active && (
                      <span className="ds-badge bg-red-50 text-red-600 ring-1 ring-red-200">OFF</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] truncate">{s.url}</div>
                  {s.last_fetched_at && (
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      Последний: {new Date(s.last_fetched_at).toLocaleString('ru-RU')}
                    </div>
                  )}
                  {s.last_error && (
                    <div className="flex items-center gap-1 text-xs text-[var(--danger)] mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      {s.last_error} ({s.fetch_error_count}x)
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(s.id, s.active)}
                    className="ds-btn-secondary p-2"
                    title={s.active ? 'Деактивировать' : 'Активировать'}
                  >
                    {s.active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteSource(s.id)}
                    className="ds-btn-secondary p-2 text-[var(--danger)]"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {sources.length === 0 && (
            <div className="ds-card p-8 text-center text-[var(--text-muted)]">
              Нет источников. Нажмите «Добавить» или примените миграцию 144.
            </div>
          )}
        </div>
      )}

      {showAdd && <AddSourceModal onClose={() => setShowAdd(false)} onAdded={loadSources} />}
    </div>
  );
}

// ── Add Modal ───────────────────────────────────────────────────────────────

function AddSourceModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [domain, setDomain] = useState<string>('ai_tech');
  const [sourceType, setSourceType] = useState<string>('rss');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/intelligence-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, label, domain, source_type: sourceType }),
      });
      const data = await res.json();
      if (data.success) {
        onAdded();
        onClose();
      } else {
        setError(data.error ?? 'Ошибка');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="ds-card p-6 w-full max-w-md space-y-4">
        <h2 className="ds-h2">Новый источник</h2>

        <div>
          <label className="ds-label">URL</label>
          <input
            className="ds-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/rss.xml"
            required
          />
        </div>

        <div>
          <label className="ds-label">Название</label>
          <input
            className="ds-input"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Habr AI"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="ds-label">Домен</label>
            <select className="ds-input" value={domain} onChange={e => setDomain(e.target.value)}>
              <option value="ai_tech">AI & Tech</option>
              <option value="travel_industry">Travel</option>
              <option value="competitors">Конкуренты</option>
            </select>
          </div>
          <div>
            <label className="ds-label">Тип</label>
            <select className="ds-input" value={sourceType} onChange={e => setSourceType(e.target.value)}>
              <option value="rss">RSS</option>
              <option value="search_tavily">Tavily Search</option>
              <option value="search_brave">Brave Search</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ds-btn-secondary">Отмена</button>
          <button type="submit" disabled={saving} className="ds-btn-primary">
            {saving ? 'Сохранение...' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  );
}
