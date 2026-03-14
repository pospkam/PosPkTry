'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Eye, EyeOff, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORIES: Record<string, string> = {
  vulkani: 'Вулканы', geyzery: 'Гейзеры', termalnye_istochniki: 'Термы',
  morskie_progulki: 'Море', rybalka: 'Рыбалка', snegohod: 'Снегоходы',
  vertoletnye_tury: 'Вертолёты', trekking: 'Трекинг', eco: 'Эко',
  medvedi: 'Медведи', dzhip: 'Джип', mountains: 'Горы',
  rivers: 'Реки', lakes: 'Озёра',
};

interface RouteRow {
  id: string;
  title: string;
  category: string;
  sourceName: string | null;
  hasCoords: boolean;
  isVisible: boolean;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 30, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState('');
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (visibility) params.set('visibility', visibility);
      const res = await fetch(`/api/admin/content/routes?${params}`);
      const json = await res.json();
      if (json.success) {
        setRoutes(json.data);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, category, visibility]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (id: string, current: boolean) => {
    setToggling(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/admin/content/routes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !current }),
      });
      if (res.ok) {
        setRoutes(prev => prev.map(r => r.id === id ? { ...r, isVisible: !current } : r));
      }
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(routes.map(r => r.id)) : new Set());
  };

  const bulkSet = async (isVisible: boolean) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/content/routes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, isVisible }),
      });
      if (res.ok) {
        setRoutes(prev => prev.map(r => selected.has(r.id) ? { ...r, isVisible } : r));
        setSelected(new Set());
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const visibleCount = routes.filter(r => r.isVisible).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-[var(--accent)]" />
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Управление маршрутами</h1>
            <p className="text-sm text-[var(--text-muted)]">Видимость маршрутов для туристов</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="ds-btn ds-btn-secondary flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Обновить
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Всего', value: pagination.total, color: 'var(--text-primary)' },
          { label: 'Видимых', value: pagination.total > 0 ? undefined : 0, fetch: true, color: 'var(--success)' },
          { label: 'Скрытых', value: pagination.total > 0 ? undefined : 0, color: 'var(--text-muted)' },
        ].map((s, i) => (
          <div key={i} className="ds-card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {i === 0 ? pagination.total : i === 1 ? visibleCount : pagination.total - visibleCount}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по названию..."
            className="ds-input pl-9 w-full text-sm"
          />
        </div>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          className="ds-input text-sm"
        >
          <option value="">Все категории</option>
          {Object.entries(CATEGORIES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={visibility}
          onChange={e => { setVisibility(e.target.value); setPage(1); }}
          className="ds-input text-sm"
        >
          <option value="">Все</option>
          <option value="visible">Видимые</option>
          <option value="hidden">Скрытые</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
          <span className="text-sm font-medium text-[var(--accent)]">Выбрано: {selected.size}</span>
          <button
            type="button"
            onClick={() => void bulkSet(true)}
            disabled={bulkLoading}
            className="ds-btn ds-btn-primary text-xs flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" /> Показать
          </button>
          <button
            type="button"
            onClick={() => void bulkSet(false)}
            disabled={bulkLoading}
            className="ds-btn ds-btn-secondary text-xs flex items-center gap-1"
          >
            <EyeOff className="w-3.5 h-3.5" /> Скрыть
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Сбросить
          </button>
        </div>
      )}

      {/* Table */}
      <div className="ds-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === routes.length && routes.length > 0}
                  onChange={e => toggleAll(e.target.checked)}
                  className="rounded"
                />
              </th>
              <th className="p-3 text-left text-[var(--text-muted)] font-medium">Название</th>
              <th className="p-3 text-left text-[var(--text-muted)] font-medium w-28">Категория</th>
              <th className="p-3 text-left text-[var(--text-muted)] font-medium w-32">Источник</th>
              <th className="p-3 text-center text-[var(--text-muted)] font-medium w-16">Гео</th>
              <th className="p-3 text-center text-[var(--text-muted)] font-medium w-24">Видимость</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">Загрузка...</td>
              </tr>
            )}
            {!loading && routes.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">Маршруты не найдены</td>
              </tr>
            )}
            {!loading && routes.map(r => (
              <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={e => {
                      setSelected(prev => {
                        const s = new Set(prev);
                        if (e.target.checked) s.add(r.id); else s.delete(r.id);
                        return s;
                      });
                    }}
                    className="rounded"
                  />
                </td>
                <td className="p-3">
                  <span className="text-[var(--text-primary)] font-medium line-clamp-1">{r.title}</span>
                </td>
                <td className="p-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                    {CATEGORIES[r.category] ?? r.category}
                  </span>
                </td>
                <td className="p-3 text-xs text-[var(--text-muted)] truncate max-w-0 w-32">
                  {r.sourceName ?? '—'}
                </td>
                <td className="p-3 text-center">
                  <MapPin className={`w-4 h-4 mx-auto ${r.hasCoords ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`} />
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() => void toggle(r.id, r.isVisible)}
                    disabled={toggling.has(r.id)}
                    aria-label={r.isVisible ? 'Скрыть' : 'Показать'}
                    className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                      r.isVisible ? 'bg-[var(--success)]' : 'bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[var(--bg-card)] shadow transition-transform ${
                      r.isVisible ? 'translate-x-5' : ''
                    }`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">
            {((page - 1) * pagination.limit) + 1}–{Math.min(page * pagination.limit, pagination.total)} из {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="ds-btn ds-btn-secondary p-2 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="ds-btn ds-btn-secondary pointer-events-none px-4">
              {page} / {pagination.pages}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="ds-btn ds-btn-secondary p-2 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
