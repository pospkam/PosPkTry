'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, FileText, DollarSign, Settings,
  TrendingUp, TrendingDown, Percent,
  Briefcase, Calendar, BarChart3, AlertCircle,
  ArrowUpRight, RefreshCw, AlertTriangle, UserCheck,
  Bell, Activity, MessageSquareText, CalendarDays,
  UserPlus, ShoppingCart, XCircle, Star, MapPin,
  type LucideIcon,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

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
  alerts?: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
  }>;
  pendingTours?: number;
  pendingPartners?: number;
}

type Period = 7 | 30 | 90;

/* ═══════════════════════════════════════════
   Formatters
   ═══════════════════════════════════════════ */

function fmt(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('ru-RU').format(value);
}

function fmtRub(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('ru-RU').format(value);
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

function Trend({ change, trend }: { change: number; trend: string }) {
  if (trend === 'neutral' || change === 0) {
    return <span className="text-[11px] text-[var(--text-muted)] font-mono">0.0%</span>;
  }
  const up = trend === 'up';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-medium ${
      up ? 'text-[var(--success)]' : 'text-[var(--danger)]'
    }`}>
      {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: '7 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
];

interface KpiDef {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  borderColor: string;
  format: (v: number) => string;
  suffix?: string;
}

const KPI_DEFS: KpiDef[] = [
  {
    key: 'activeUsers', label: 'Пользователи', icon: Users,
    color: 'text-[var(--ocean)]', borderColor: 'border-l-[var(--ocean)]',
    format: fmt,
  },
  {
    key: 'totalBookings', label: 'Бронирования', icon: CalendarDays,
    color: 'text-[var(--accent)]', borderColor: 'border-l-[var(--accent)]',
    format: fmt,
  },
  {
    key: 'totalRevenue', label: 'Выручка', icon: DollarSign,
    color: 'text-[var(--success)]', borderColor: 'border-l-[var(--success)]',
    format: fmtRub, suffix: ' \u20BD',
  },
  {
    key: 'conversionRate', label: 'Конверсия', icon: Percent,
    color: 'text-[var(--warning)]', borderColor: 'border-l-[var(--warning)]',
    format: (v) => v.toFixed(1), suffix: '%',
  },
];

/* Activity type → icon + color */
function getActivityStyle(type: string): { icon: LucideIcon; dotColor: string } {
  switch (type) {
    case 'booking': case 'booking_created': case 'new_booking':
      return { icon: ShoppingCart, dotColor: 'bg-[var(--success)]' };
    case 'user': case 'user_registered': case 'new_user':
      return { icon: UserPlus, dotColor: 'bg-[var(--ocean)]' };
    case 'tour': case 'tour_created': case 'tour_updated':
      return { icon: MapPin, dotColor: 'bg-[var(--accent)]' };
    case 'review': case 'new_review':
      return { icon: Star, dotColor: 'bg-[var(--warning)]' };
    case 'cancel': case 'booking_cancelled':
      return { icon: XCircle, dotColor: 'bg-[var(--danger)]' };
    default:
      return { icon: Activity, dotColor: 'bg-[var(--text-muted)]' };
  }
}

/* ═══════════════════════════════════════════
   Dashboard
   ═══════════════════════════════════════════ */

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>(30);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/dashboard?period=${p}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [fetchData, period]);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
  };

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="p-5 lg:p-6 space-y-5">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 rounded bg-[var(--bg-hover)] animate-pulse" />
          <div className="h-8 w-32 rounded-lg bg-[var(--bg-hover)] animate-pulse" />
        </div>
        {/* KPI skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[104px] rounded-lg bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 h-80 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
          <div className="lg:col-span-2 h-80 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
        </div>
        {/* Shortcuts skeleton */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--danger)]/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-5 h-5 text-[var(--danger)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Ошибка загрузки</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">{error}</p>
          <button
            onClick={() => fetchData(period)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 rounded-md hover:bg-[var(--accent)]/15 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const metrics = data.metrics;
  const maxBookings = Math.max(...data.charts.topTours.map(t => t.bookings), 1);
  const maxRevenue = Math.max(...data.charts.topTours.map(t => t.revenue), 1);

  const shortcuts = [
    { icon: Calendar, label: 'Бронирования', href: '/hub/admin/bookings', badge: 0 },
    { icon: Users, label: 'Пользователи', href: '/hub/admin/users', badge: 0 },
    { icon: FileText, label: 'Модерация', href: '/hub/admin/content/tours', badge: data.pendingTours ?? 0 },
    { icon: Briefcase, label: 'Партнёры', href: '/hub/admin/content/partners', badge: data.pendingPartners ?? 0 },
    { icon: MessageSquareText, label: 'Отзывы', href: '/hub/admin/content/reviews', badge: 0 },
    { icon: UserCheck, label: 'Операторы', href: '/hub/admin/operators', badge: 0 },
    { icon: BarChart3, label: 'Аналитика', href: '/hub/admin/analytics', badge: 0 },
    { icon: DollarSign, label: 'Финансы', href: '/hub/admin/finance', badge: 0 },
    { icon: Activity, label: 'Активность', href: '/hub/admin/activity', badge: 0 },
    { icon: Bell, label: 'Уведомления', href: '/hub/admin/notifications', badge: 0 },
    { icon: Settings, label: 'Настройки', href: '/hub/admin/settings', badge: 0 },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-[1400px]">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight leading-none">
              Панель управления
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Обзор за {period} дней
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period tabs */}
          <div className="flex bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-0.5">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handlePeriod(opt.value)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                  period === opt.value
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchData(period)}
            className="p-2 text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] transition-colors"
            title="Обновить"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Pending banners ─── */}
      {((data.pendingTours ?? 0) > 0 || (data.pendingPartners ?? 0) > 0) && (
        <div className="flex flex-wrap gap-2">
          {(data.pendingTours ?? 0) > 0 && (
            <button
              onClick={() => router.push('/hub/admin/content/tours')}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[var(--warning)] bg-[var(--warning)]/8 border border-[var(--warning)]/15 rounded-lg hover:bg-[var(--warning)]/12 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {data.pendingTours} туров ожидают модерации
              <ArrowUpRight className="w-3 h-3 opacity-60" />
            </button>
          )}
          {(data.pendingPartners ?? 0) > 0 && (
            <button
              onClick={() => router.push('/hub/admin/content/partners')}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[var(--ocean)] bg-[var(--ocean)]/8 border border-[var(--ocean)]/15 rounded-lg hover:bg-[var(--ocean)]/12 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {data.pendingPartners} партнёров на верификации
              <ArrowUpRight className="w-3 h-3 opacity-60" />
            </button>
          )}
        </div>
      )}

      {/* ─── AI Alerts ─── */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="space-y-1.5">
          {data.alerts.map(alert => {
            const styles = {
              error: { bg: 'bg-[var(--danger)]/6', border: 'border-[var(--danger)]/15', text: 'text-[var(--danger)]' },
              warning: { bg: 'bg-[var(--warning)]/6', border: 'border-[var(--warning)]/15', text: 'text-[var(--warning)]' },
              info: { bg: 'bg-[var(--ocean)]/6', border: 'border-[var(--ocean)]/15', text: 'text-[var(--ocean)]' },
            };
            const s = styles[alert.type];
            return (
              <div
                key={alert.id}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs border rounded-lg ${s.bg} ${s.border} ${s.text}`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold shrink-0">{alert.title}</span>
                <span className="opacity-70 flex-1 truncate">{alert.message}</span>
                {alert.actionUrl && (
                  <button
                    onClick={() => router.push(alert.actionUrl!)}
                    className="shrink-0 flex items-center gap-0.5 font-medium hover:underline"
                  >
                    {alert.actionLabel ?? 'Подробнее'} <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_DEFS.map((kpi) => {
          const m = metrics[kpi.key as keyof typeof metrics];
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.key}
              className={`bg-[var(--bg-card)] border border-[var(--border)] ${kpi.borderColor} border-l-[3px] rounded-lg px-4 py-4 relative overflow-hidden group hover:bg-[var(--bg-hover)] transition-colors`}
            >
              {/* Icon top-right */}
              <div className={`absolute top-3 right-3 w-8 h-8 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center ${kpi.color} opacity-60 group-hover:opacity-100 transition-opacity`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Label */}
              <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[var(--text-muted)] mb-2">
                {kpi.label}
              </p>

              {/* Value */}
              <p className="text-2xl lg:text-[28px] font-semibold text-[var(--text-primary)] font-mono leading-none tracking-tight">
                {kpi.format(m.value)}{kpi.suffix && <span className="text-base font-normal text-[var(--text-muted)] ml-0.5">{kpi.suffix}</span>}
              </p>

              {/* Trend */}
              <div className="mt-2">
                <Trend change={m.change} trend={m.trend} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Content: Tours + Activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Top tours — 3 cols */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">Популярные туры</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">{data.charts.topTours.length} шт</span>
          </div>
          {data.charts.topTours.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <BarChart3 className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
              <p className="text-xs text-[var(--text-muted)]">Нет данных за выбранный период</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.charts.topTours.map((tour, idx) => {
                const bookingPct = (tour.bookings / maxBookings) * 100;
                return (
                  <div
                    key={tour.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors group"
                  >
                    {/* Rank */}
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold font-mono shrink-0 ${
                      idx === 0
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : idx < 3
                          ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                          : 'text-[var(--text-muted)]'
                    }`}>
                      {idx + 1}
                    </span>

                    {/* Tour info + bar */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate mb-1.5 group-hover:text-[var(--accent)] transition-colors">
                        {tour.title}
                      </p>
                      {/* Inline bar */}
                      <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)]/40 rounded-full transition-all duration-500"
                          style={{ width: `${bookingPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-[var(--text-muted)] leading-none mb-0.5">Броней</p>
                        <p className="text-xs font-semibold text-[var(--text-primary)] font-mono">{tour.bookings}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[var(--text-muted)] leading-none mb-0.5">Выручка</p>
                        <p className="text-xs font-semibold text-[var(--text-primary)] font-mono">{fmtRub(tour.revenue)} &#8381;</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity — 2 cols */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">Лента активности</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">24ч</span>
          </div>
          <div className="flex-1 max-h-80 overflow-y-auto">
            {data.recentActivities.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <Activity className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
                <p className="text-xs text-[var(--text-muted)]">Нет активности</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.recentActivities.map((act) => {
                  const style = getActivityStyle(act.type);
                  return (
                    <div key={act.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                      {/* Status dot */}
                      <div className="pt-1 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${style.dotColor}`} />
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[var(--text-primary)] leading-snug">{act.description}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                          {new Date(act.timestamp).toLocaleString('ru-RU', {
                            hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[var(--text-muted)]">Быстрый доступ</p>
          <div className="h-px flex-1 bg-[var(--border)] ml-3" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            const hasBadge = s.badge > 0;
            return (
              <button
                key={s.href}
                onClick={() => router.push(s.href)}
                className={`relative bg-[var(--bg-card)] border rounded-lg px-3 py-3 flex flex-col items-center gap-2 text-center transition-all group ${
                  hasBadge
                    ? 'border-[var(--danger)]/20 hover:border-[var(--danger)]/40'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/30'
                } hover:bg-[var(--bg-hover)]`}
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-hover)] group-hover:bg-[var(--accent)]/10 flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] leading-tight font-medium">{s.label}</span>
                {hasBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--danger)] text-[var(--text-primary)] text-[10px] font-bold flex items-center justify-center shadow-sm">
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
