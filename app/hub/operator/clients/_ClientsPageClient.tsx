'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import CustomerProfileModal from '@/components/operator/CustomerProfileModal';
import {
  Users, Search, Mail, Phone, Calendar,
  Star, TrendingUp, Download, ChevronLeft, ChevronRight, AlertCircle,
} from 'lucide-react';

type Status = 'vip' | 'active' | 'inactive';

interface Customer {
  id: string; name: string; email: string; phone: string;
  totalBookings: number; totalSpent: number;
  lastBookingDate: string | null; status: Status;
}

interface Meta { total: number; page: number; limit: number; pages: number }

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';
const SELECT = 'px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors';

const STATUS_BADGE: Record<Status, React.ReactNode> = {
  vip:      <span className="px-2 py-1 bg-[var(--warning)]/10 text-[var(--warning)] rounded-full text-xs font-bold">VIP</span>,
  active:   <span className="px-2 py-1 bg-[var(--success)]/10 text-[var(--success)] rounded-full text-xs font-bold">Активный</span>,
  inactive: <span className="px-2 py-1 bg-[var(--bg-hover)] text-[var(--text-muted)] rounded-full text-xs font-bold">Неактивный</span>,
};

function fmt(v: number) { return new Intl.NumberFormat('ru-RU').format(v); }

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClientsPageClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta]           = useState<Meta>({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<'all' | Status>('all');
  const [page, setPage]           = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(pg), limit: '20', sort: 'total_spent',
        ...(search     ? { search }       : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/operator/clients?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка загрузки');
      setCustomers(json.data.customers);
      setMeta(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { load(page); }, [load, page]);

  function exportCsv() {
    const rows = customers.map(c =>
      [c.name, c.email, c.phone || '', c.totalBookings, c.totalSpent, fmtDate(c.lastBookingDate), c.status]
        .map(v => `"${v}"`).join(',')
    );
    const csv = ['Имя,Email,Телефон,Бронирования,Потрачено,Последняя бронь,Статус', ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'clients.csv';
    a.click();
  }

  const vipCount      = customers.filter(c => c.status === 'vip').length;
  const totalSpentSum = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalBookings = customers.reduce((s, c) => s + c.totalBookings, 0);

  return (
    <>
      <div className="p-5 lg:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Клиенты</h1>
            <p className="text-[var(--text-muted)] mt-1">
              {loading ? '...' : `${meta.total} клиентов в базе`}
            </p>
          </div>
          <button
            onClick={exportCsv}
            disabled={loading || customers.length === 0}
            className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Экспорт CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users,      color: 'bg-[var(--bg-hover)]',       iconColor: 'text-[var(--text-muted)]',  label: 'Клиентов',        value: meta.total },
            { icon: Star,       color: 'bg-[var(--warning)]/10',     iconColor: 'text-[var(--warning)]',     label: 'VIP',             value: vipCount },
            { icon: TrendingUp, color: 'bg-[var(--success)]/10',     iconColor: 'text-[var(--success)]',     label: 'Выручка со стр.', value: `${fmt(totalSpentSum)} ₽` },
            { icon: Calendar,   color: 'bg-[var(--accent)]/10',      iconColor: 'text-[var(--accent)]',      label: 'Бронирований',    value: totalBookings },
          ].map(({ icon: Icon, color, iconColor, label, value }) => (
            <div key={label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${color} rounded-md`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none text-[var(--text-primary)]">{value}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Поиск по имени или email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${INPUT} pl-10`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value as 'all' | Status)}
            className={SELECT}
          >
            <option value="all">Все статусы</option>
            <option value="vip">VIP</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" message="Загрузка клиентов..." />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <AlertCircle className="w-10 h-10 text-[var(--danger)]" />
            <p className="text-[var(--text-muted)]">{error}</p>
            <button onClick={() => load(page)} className="text-[var(--accent)] underline text-sm">Повторить</button>
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12 text-[var(--text-muted)] opacity-40" />}
            title="Клиенты не найдены"
            description={search || statusFilter !== 'all' ? 'Попробуйте изменить параметры поиска' : 'Первая бронь у клиента появится здесь'}
          />
        ) : (
          <>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
                    {['Клиент', 'Контакты', 'Бронирований', 'Потрачено', 'Последняя бронь', 'Статус'].map(h => (
                      <th key={h} className="text-left p-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-[var(--accent)] font-bold">{c.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium whitespace-nowrap text-[var(--text-primary)]">{c.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                            <Mail className="w-4 h-4 shrink-0" />
                            <span className="truncate max-w-[160px]">{c.email}</span>
                          </div>
                          {c.phone && (
                            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                              <Phone className="w-4 h-4 shrink-0" />{c.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-[var(--text-primary)]">{c.totalBookings}</span>
                        <span className="text-[var(--text-muted)] text-sm ml-1">туров</span>
                      </td>
                      <td className="p-4 font-bold text-[var(--warning)] whitespace-nowrap">{fmt(c.totalSpent)} ₽</td>
                      <td className="p-4 text-[var(--text-muted)] text-sm whitespace-nowrap">{fmtDate(c.lastBookingDate)}</td>
                      <td className="p-4">{STATUS_BADGE[c.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-[var(--text-muted)]">
                  {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} из {meta.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-sm text-[var(--text-secondary)]">
                    {page} / {meta.pages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                    disabled={page === meta.pages}
                    className="p-2 border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {selectedId && (
        <CustomerProfileModal
          clientId={selectedId}
          onClose={() => setSelectedId(null)}
          onTagsUpdated={(_id, newTags) => {
            void newTags;
          }}
        />
      )}
    </>
  );
}
