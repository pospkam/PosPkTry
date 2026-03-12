'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Database, Globe, MapPin, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface KnowledgeRoute {
  id: string;
  title: string;
  category: string;
  description: string | null;
  source_url: string | null;
  source_name: string | null;
  lat: number | null;
  lng: number | null;
  difficulty: string | null;
  duration: string | null;
  season: string | null;
  price_from: string | null;
  has_embedding: boolean;
  created_at: string;
  updated_at: string;
}

interface KnowledgeStats {
  totalRoutes: number;
  embeddedCount: number;
  categories: Array<{ category: string; count: number }>;
  sources: Array<{ source: string; count: number }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  vulkani: 'Вулканы',
  geyzery: 'Гейзеры',
  termalnye_istochniki: 'Термальные',
  rybalka: 'Рыбалка',
  snegohod: 'Снегоход',
  dzhip: 'Джип',
  morskie_progulki: 'Морские',
  trekking: 'Треккинг',
  lakes: 'Озёра',
  mountains: 'Горы',
  rivers: 'Реки',
  medvedi: 'Медведи',
  vertoletnye_tury: 'Вертолёт',
  eco: 'Эко',
};

export default function KnowledgeBasePage() {
  const [routes, setRoutes] = useState<KnowledgeRoute[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/knowledge/stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch { /* ignore */ }
  }, []);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const res = await fetch(`/api/admin/knowledge?${params}`);
      const json = await res.json();
      if (json.success) {
        setRoutes(json.data.routes);
        setTotalPages(json.data.totalPages);
        setTotal(json.data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, category]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRoutes();
  };

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">База знаний AI</h1>
        </div>
        <button
          onClick={() => { fetchStats(); fetchRoutes(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Обновить
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Маршрутов</p>
            <span className="text-xl font-semibold text-[var(--text-primary)] font-mono">{stats.totalRoutes}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">С embeddings</p>
            <div className="flex items-end gap-2">
              <span className="text-xl font-semibold text-[var(--text-primary)] font-mono">{stats.embeddedCount}</span>
              {stats.totalRoutes > 0 && (
                <span className="text-xs text-[var(--text-muted)] font-mono mb-0.5">
                  {Math.round((stats.embeddedCount / stats.totalRoutes) * 100)}%
                </span>
              )}
            </div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Категорий</p>
            <span className="text-xl font-semibold text-[var(--text-primary)] font-mono">{stats.categories.length}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Источников</p>
            <span className="text-xl font-semibold text-[var(--text-primary)] font-mono">{stats.sources.length}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 text-xs bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity"
          >
            Найти
          </button>
        </form>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">Все категории</option>
          {stats?.categories.map(c => (
            <option key={c.category} value={c.category}>
              {CATEGORY_LABELS[c.category] ?? c.category} ({c.count})
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Маршруты</span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{total} найдено</span>
        </div>

        {loading ? (
          <div className="px-4 py-16 text-center">
            <div className="inline-block w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
          </div>
        ) : routes.length === 0 ? (
          <p className="px-4 py-16 text-center text-xs text-[var(--text-muted)]">Маршруты не найдены</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="px-4 py-2 text-left font-medium">Название</th>
                  <th className="py-2 text-left font-medium">Категория</th>
                  <th className="py-2 text-left font-medium">Источник</th>
                  <th className="py-2 text-center font-medium">Сложность</th>
                  <th className="py-2 text-center font-medium">Длительность</th>
                  <th className="py-2 text-center font-medium">Координаты</th>
                  <th className="py-2 text-center font-medium">Embedding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {routes.map(route => (
                  <tr key={route.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="max-w-[300px]">
                        <p className="text-[var(--text-primary)] truncate font-medium">{route.title}</p>
                        {route.description && (
                          <p className="text-[var(--text-muted)] truncate mt-0.5">{route.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex px-1.5 py-0.5 text-[10px] rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        {CATEGORY_LABELS[route.category] ?? route.category}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {route.source_url ? (
                        <a
                          href={route.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                        >
                          <Globe className="w-3 h-3" />
                          {route.source_name ?? 'Источник'}
                        </a>
                      ) : (
                        <span className="text-[var(--text-muted)]">{route.source_name ?? '—'}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center text-[var(--text-secondary)]">{route.difficulty ?? '—'}</td>
                    <td className="py-2.5 text-center text-[var(--text-secondary)]">{route.duration ?? '—'}</td>
                    <td className="py-2.5 text-center">
                      {route.lat && route.lng ? (
                        <MapPin className="w-3 h-3 text-[var(--success)] mx-auto" />
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${route.has_embedding ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]/30'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)]">
              Стр. {page} из {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-[var(--border)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3 h-3 text-[var(--text-muted)]" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-[var(--border)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sources breakdown */}
      {stats && stats.sources.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Источники данных</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {stats.sources.map(s => (
              <div key={s.source} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-[var(--text-primary)]">{s.source}</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
