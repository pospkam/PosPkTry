'use client';

import { useEffect, useState, useCallback } from 'react';
import { Rss, Plus, Trash2, RefreshCw, AlertTriangle, Check, X } from 'lucide-react';

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

export default function IntelligenceSourcesClient() {
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

  const rssSources = sources.filter(s => s.source_type === 'rss');
  const searchSources = sources.filter(s => s.source_type.startsWith('search_'));
  const errorSources = sources.filter(s => s.fetch_error_count > 0);

  return (
    <div className="ds-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-h1">Источники разведки</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            RSS-фиды и поисковые запросы для Intelligence Monitor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadSources} className="ds-btn-secondary">
            <RefreshCw className="w-4 h-4" /> Обновить
          </button>
          <button onClick={() => setShowAdd(true)} className="ds-btn-primary">
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="ds-card p-4">
          <div className="text-2xl font-bold">{rssSources.length}</div>
          <div className="text-xs text-[var(--text-muted)]">RSS-фидов</div>
        </div>
        <div className="ds-card p-4">
          <div className="text-2xl font-bold">{searchSources.length}</div>
          <div className="text-xs text-[var(--text-muted)]">Поисковых запросов</div>
        </div>
        <div className="ds-card p-4">
          <div className="text-2xl font-bold">{sources.filter(s => s.active).length}</div>
          <div className="text-xs text-[var(--text-muted)]">Активных</div>
        </div>
        <div className="ds-card p-4">
          <div className="text-2xl font-bold text-[var(--danger)]">{errorSources.length}</div>
          <div className="text-xs text-[var(--text-muted)]">С ошибками</div>
        </div>
      </div>

      {/* Domain filter */}
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

      {error && (
        <div className="ds-card p-4 border-[var(--danger)] bg-red-50 text-[var(--danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="ds-card p-8 text-center text-[var(--text-muted)]">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {sources.map(s => (
            <div key={s.id} className={`ds-card p-4 ${!s.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Rss className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span className="font-medium truncate">{s.label}</span>
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
                      Последний запрос: {new Date(s.last_fetched_at).toLocaleString('ru-RU')}
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

      {/* Add modal */}
      {showAdd && <AddSourceModal onClose={() => setShowAdd(false)} onAdded={loadSources} />}
    </div>
  );
}

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
            <select
              className="ds-input"
              value={domain}
              onChange={e => setDomain(e.target.value)}
            >
              <option value="ai_tech">AI & Tech</option>
              <option value="travel_industry">Travel</option>
              <option value="competitors">Конкуренты</option>
            </select>
          </div>
          <div>
            <label className="ds-label">Тип</label>
            <select
              className="ds-input"
              value={sourceType}
              onChange={e => setSourceType(e.target.value)}
            >
              <option value="rss">RSS</option>
              <option value="search_tavily">Tavily Search</option>
              <option value="search_brave">Brave Search</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ds-btn-secondary">
            Отмена
          </button>
          <button type="submit" disabled={saving} className="ds-btn-primary">
            {saving ? 'Сохранение...' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  );
}
