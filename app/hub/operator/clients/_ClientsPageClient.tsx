'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
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

function getToken() {
  return localStorage.getItem('token') ?? localStorage.getItem('admin_token') ?? '';
}

const STATUS_BADGE: Record<Status, React.ReactNode> = {
  vip:      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">VIP</span>,
  active:   <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">Активный</span>,
  inactive: <span className="px-2 py-1 bg-white/10 text-white/40 rounded-full text-xs font-bold">Неактивный</span>,
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

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(pg), limit: '20', sort: 'total_spent',
        ...(search     ? { search }       : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/operator/clients?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
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
    <Protected roles={['operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <OperatorNav />
        <div className="p-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Клиенты</h1>
              <p className="text-white/60 mt-1">
                {loading ? '...' : `${meta.total} клиентов в базе`}
              </p>
            </div>
            <button
              onClick={exportCsv}
              disabled={loading || customers.length === 0}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              <Download className="w-5 h-5" /> Экспорт CSV
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Users,     color: 'bg-white/20',       iconColor: 'text-white/70',   label: 'Клиентов',       value: meta.total },
              { icon: Star,      color: 'bg-yellow-500/20',  iconColor: 'text-yellow-400', label: 'VIP',            value: vipCount },
              { icon: TrendingUp,color: 'bg-green-500/20',   iconColor: 'text-green-400',  label: 'Выручка со стр.', value: `${fmt(totalSpentSum)} ₽` },
              { icon: Calendar,  color: 'bg-purple-500/20',  iconColor: 'text-purple-400', label: 'Бронирований',   value: totalBookings },
            ].map(({ icon: Icon, color, iconColor, label, value }) => (
              <div key={label} className="bg-white/10 border border-white/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${color} rounded-lg`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{value}</p>
                    <p className="text-sm text-white/60 mt-0.5">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Поиск по имени или email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value as 'all' | Status)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="all" className="bg-gray-900">Все статусы</option>
              <option value="vip" className="bg-gray-900">VIP</option>
              <option value="active" className="bg-gray-900">Активные</option>
              <option value="inactive" className="bg-gray-900">Неактивные</option>
            </select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка клиентов..." />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-20 gap-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-white/60">{error}</p>
              <button onClick={() => load(page)} className="text-cyan-400 underline text-sm">Повторить</button>
            </div>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12 text-white/30" />}
              title="Клиенты не найдены"
              description={search || statusFilter !== 'all' ? 'Попробуйте изменить параметры поиска' : 'Первая бронь у клиента появится здесь'}
            />
          ) : (
            <>
              <div className="bg-white/10 border border-white/20 rounded-2xl overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['Клиент', 'Контакты', 'Бронирований', 'Потрачено', 'Последняя бронь', 'Статус'].map(h => (
                        <th key={h} className="text-left p-4 text-white/60 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-cyan-400 font-bold">{c.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="font-medium whitespace-nowrap">{c.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <Mail className="w-4 h-4 shrink-0" />
                              <span className="truncate max-w-[160px]">{c.email}</span>
                            </div>
                            {c.phone && (
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <Phone className="w-4 h-4 shrink-0" />{c.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold">{c.totalBookings}</span>
                          <span className="text-white/50 text-sm ml-1">туров</span>
                        </td>
                        <td className="p-4 font-bold text-yellow-400 whitespace-nowrap">{fmt(c.totalSpent)} ₽</td>
                        <td className="p-4 text-white/60 text-sm whitespace-nowrap">{fmtDate(c.lastBookingDate)}</td>
                        <td className="p-4">{STATUS_BADGE[c.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {meta.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-white/50">
                    {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} из {meta.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm">
                      {page} / {meta.pages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                      disabled={page === meta.pages}
                      className="p-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </Protected>
  );
}
