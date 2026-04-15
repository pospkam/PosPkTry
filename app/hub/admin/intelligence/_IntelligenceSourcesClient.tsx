'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Rss, Plus, Trash2, RefreshCw, AlertTriangle, Check, X,
  Play, Clock, Activity, Zap, CheckCircle, XCircle,
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
        <div className="ds-card p-4 flex flex-col justify-center">
          <button
            onClick={triggerCycle}
            disabled={running}
            className="ds-btn-primary w-full justify-center"
          >
            {running ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Запуск...' : 'Запустить'}
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

      {/* RSS test */}
      <RssTestCard />
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
