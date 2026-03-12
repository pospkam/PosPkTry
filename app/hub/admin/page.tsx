'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, FileText, DollarSign, Settings,
  CheckCircle, Clock, TrendingUp, TrendingDown,
  Briefcase, Calendar, BarChart3, AlertCircle,
  ArrowUpRight, RefreshCw, AlertTriangle, UserCheck,
  Bell, Activity, MessageSquareText,
} from 'lucide-react';

interface MetricItem {
  value: number;
  change: number;
  trend: string;
}

interface DashboardData {
  metrics: {
    totalRevenue: MetricItem;
    totalBookings: MetricItem;
    activeUsers: MetricItem;
    conversionRate: MetricItem;
  };
  charts: {
    topTours: Array<{ id: string; title: string; bookings: number; revenue: number }>;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
  pendingTours?: number;
  pendingPartners?: number;
}

function fmt(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('ru-RU').format(value);
}

function fmtRub(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₽`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ₽`;
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

function Trend({ change, trend }: { change: number; trend: string }) {
  if (trend === 'neutral' || change === 0) {
    return <span className="text-xs text-[var(--text-muted)]">—</span>;
  }
  const up = trend === 'up';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${
      up ? 'text-[var(--success)]' : 'text-[var(--danger)]'
    }`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard?period=30');
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-6 w-40 rounded bg-[var(--bg-hover)] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
          <div className="h-64 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-[var(--danger)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Ошибка загрузки</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: 'Пользователи', value: fmt(data.metrics.activeUsers.value), metric: data.metrics.activeUsers },
    { label: 'Бронирования', value: fmt(data.metrics.totalBookings.value), metric: data.metrics.totalBookings },
    { label: 'Выручка', value: fmtRub(data.metrics.totalRevenue.value), metric: data.metrics.totalRevenue },
    { label: 'Конверсия', value: `${data.metrics.conversionRate.value.toFixed(1)}%`, metric: data.metrics.conversionRate },
  ];

  const shortcuts = [
    { icon: Calendar, label: 'Бронирования', href: '/hub/admin/bookings' },
    { icon: Users, label: 'Пользователи', href: '/hub/admin/users' },
    { icon: FileText, label: 'Модерация туров', href: '/hub/admin/content/tours', badge: data.pendingTours },
    { icon: Briefcase, label: 'Партнёры', href: '/hub/admin/content/partners', badge: data.pendingPartners },
    { icon: MessageSquareText, label: 'Отзывы', href: '/hub/admin/content/reviews' },
    { icon: UserCheck, label: 'Операторы', href: '/hub/admin/operators' },
    { icon: BarChart3, label: 'Аналитика', href: '/hub/admin/analytics' },
    { icon: DollarSign, label: 'Финансы', href: '/hub/admin/finance' },
    { icon: Activity, label: 'Активность', href: '/hub/admin/activity' },
    { icon: Bell, label: 'Уведомления', href: '/hub/admin/notifications' },
    { icon: Settings, label: 'Настройки', href: '/hub/admin/settings' },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">

      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Обзор</h1>
          <span className="text-xs text-[var(--text-muted)] font-mono">30д</span>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Обновить
        </button>
      </div>

      {/* Алерты */}
      {((data.pendingTours ?? 0) > 0 || (data.pendingPartners ?? 0) > 0) && (
        <div className="flex flex-wrap gap-2">
          {(data.pendingTours ?? 0) > 0 && (
            <button
              onClick={() => router.push('/hub/admin/content/tours')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--warning)] bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-md hover:bg-[var(--warning)]/15 transition-colors"
            >
              <AlertTriangle className="w-3 h-3" />
              {data.pendingTours} туров на модерации
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
          {(data.pendingPartners ?? 0) > 0 && (
            <button
              onClick={() => router.push('/hub/admin/content/partners')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent-muted)] border border-[var(--accent)]/20 rounded-md hover:bg-[var(--accent)]/15 transition-colors"
            >
              <AlertTriangle className="w-3 h-3" />
              {data.pendingPartners} партнёров на верификации
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3.5"
          >
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">{kpi.label}</p>
            <div className="flex items-end justify-between gap-2">
              <span className="text-xl font-semibold text-[var(--text-primary)] font-mono leading-none">{kpi.value}</span>
              <Trend change={kpi.metric.change} trend={kpi.metric.trend} />
            </div>
          </div>
        ))}
      </div>

      {/* Содержимое: топ туры + активность */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Топ туры */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Топ туры</span>
            <span className="text-[10px] text-[var(--text-muted)]">30 дней</span>
          </div>
          {data.charts.topTours.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-[var(--text-muted)]">Нет данных</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="px-4 py-2 text-left font-medium w-8">#</th>
                  <th className="py-2 text-left font-medium">Тур</th>
                  <th className="py-2 text-right font-medium pr-4">Броней</th>
                  <th className="py-2 text-right font-medium pr-4">Выручка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.charts.topTours.map((tour, idx) => (
                  <tr key={tour.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-2.5 text-[var(--text-muted)] font-mono">{idx + 1}</td>
                    <td className="py-2.5 text-[var(--text-primary)] truncate max-w-[280px]">{tour.title}</td>
                    <td className="py-2.5 text-right pr-4 text-[var(--text-secondary)] font-mono">{tour.bookings}</td>
                    <td className="py-2.5 text-right pr-4 text-[var(--text-primary)] font-mono font-medium">{fmtRub(tour.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Активность */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Активность</span>
            <span className="text-[10px] text-[var(--text-muted)]">24ч</span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border)]">
            {data.recentActivities.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-[var(--text-muted)]">Нет активности</p>
            ) : (
              data.recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                  <CheckCircle className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-primary)] truncate">{act.description}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
                      {new Date(act.timestamp).toLocaleString('ru-RU', {
                        hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2.5">Управление</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.href}
                onClick={() => router.push(s.href)}
                className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-3 flex flex-col items-center gap-1.5 text-center hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-colors group"
              >
                <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
                <span className="text-[10px] text-[var(--text-secondary)] leading-tight">{s.label}</span>
                {s.badge && s.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center">
                    {s.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
