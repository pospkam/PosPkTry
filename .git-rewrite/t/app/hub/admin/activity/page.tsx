'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, RefreshCw, AlertCircle, CheckCircle, User, FileText,
  ChevronLeft, ChevronRight, Search, Filter,
} from 'lucide-react';

interface AuditItem {
  id: string;
  source: string;
  action: string;
  resource_type: string | null;
  entity_type: string | null;
  details: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

interface PageData {
  items: AuditItem[];
  total: number;
  page: number;
  totalPages: number;
}

const SOURCE_LABELS: Record<string, { label: string; icon: typeof CheckCircle; cls: string }> = {
  audit:   { label: 'Система', icon: Activity,    cls: 'text-[var(--accent)]' },
  booking: { label: 'Бронь',   icon: CheckCircle, cls: 'text-[var(--success)]' },
  partner: { label: 'Партнёр', icon: FileText,    cls: 'text-[var(--warning)]' },
};

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'audit', label: 'Система' },
  { value: 'booking', label: 'Бронирования' },
  { value: 'partner', label: 'Партнёры' },
];

export default function AdminActivity() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30', type });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/audit-log?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page, type, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Журнал аудита</h1>
          {data && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono">{data.total} записей</span>
          )}
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Обновить
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-[var(--text-muted)]" />
          {SOURCE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setType(opt.value); setPage(1); }}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md border transition-colors ${
                type === opt.value
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Поиск по действию, email..."
              className="pl-7 pr-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-48 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            Найти
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 max-w-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-[var(--danger)]" />
            <span className="text-sm text-[var(--text-primary)]">Ошибка</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">{error}</p>
          <button onClick={fetchData} className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Повторить
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
          <Activity className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text-muted)]">Записей не найдено</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="px-4 py-2.5 text-left font-medium w-10"></th>
                <th className="py-2.5 text-left font-medium">Источник</th>
                <th className="py-2.5 text-left font-medium">Действие</th>
                <th className="py-2.5 text-left font-medium hidden lg:table-cell">Пользователь</th>
                <th className="py-2.5 text-left font-medium hidden md:table-cell">IP</th>
                <th className="py-2.5 text-right font-medium pr-4">Время</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.items.map(item => {
                const cfg = SOURCE_LABELS[item.source] ?? SOURCE_LABELS.audit;
                const Icon = cfg.icon;
                return (
                  <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <Icon className={`w-3.5 h-3.5 ${cfg.cls}`} />
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        item.source === 'booking' ? 'bg-[var(--success)]/10 text-[var(--success)]'
                        : item.source === 'partner' ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
                        : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      }`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-primary)] truncate max-w-[200px]">
                      {item.action}
                      {item.resource_type && (
                        <span className="ml-1 text-[var(--text-muted)]">({item.resource_type})</span>
                      )}
                      {item.entity_type && (
                        <span className="ml-1 text-[var(--text-muted)]">({item.entity_type})</span>
                      )}
                    </td>
                    <td className="py-3 text-[var(--text-secondary)] hidden lg:table-cell truncate max-w-[160px]">
                      {item.user_name ?? item.user_email ?? '—'}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] font-mono hidden md:table-cell">
                      {item.ip_address ?? '—'}
                    </td>
                    <td className="py-3 text-right pr-4 text-[var(--text-muted)] font-mono whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString('ru-RU', {
                        hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[var(--text-muted)]">
            Стр. {data.page} из {data.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
