'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';

interface ChartData {
  revenueByMonth: Array<{ date: string; value: number }>;
  bookingsByCategory: Array<{ category: string; value: number }>;
  userGrowth: Array<{ date: string; value: number }>;
  topTours: Array<{ id: string; title: string; bookings: number; revenue: number }>;
}

interface DashboardResponse {
  metrics: {
    totalRevenue: { value: number; change: number; trend: string };
    totalBookings: { value: number; change: number; trend: string };
    activeUsers: { value: number; change: number; trend: string };
    conversionRate: { value: number; change: number; trend: string };
    averageOrderValue?: { value: number; change: number; trend: string };
  };
  charts: ChartData;
}

function fmtRub(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₽`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K ₽`;
  return `${v.toLocaleString('ru-RU')} ₽`;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр', '05': 'Май', '06': 'Июн',
  '07': 'Июл', '08': 'Авг', '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
};

const CATEGORY_LABELS: Record<string, string> = {
  operator: 'Операторы', guide: 'Гиды', transfer: 'Трансферы',
  stay: 'Размещение', other: 'Прочее',
};

function BarChart({ items, label }: { items: Array<{ name: string; value: number }>; label: string }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">{label}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-secondary)] w-16 shrink-0 truncate">{item.name}</span>
            <div className="flex-1 h-5 bg-[var(--bg-hover)] rounded overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded transition-all"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[var(--text-primary)] w-14 text-right shrink-0">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard?period=90');
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

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-5 w-32 bg-[var(--bg-hover)] rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-[var(--danger)]" />
            <span className="text-sm text-[var(--text-primary)]">Ошибка</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">{error}</p>
          <button onClick={fetchData} className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const revenueItems = data.charts.revenueByMonth.map(r => ({
    name: MONTH_NAMES[r.date.split('-')[1]] ?? r.date,
    value: r.value,
  }));

  const categoryItems = data.charts.bookingsByCategory.map(c => ({
    name: CATEGORY_LABELS[c.category] ?? c.category,
    value: c.value,
  }));

  const userItems = data.charts.userGrowth.slice(-14).map(u => ({
    name: new Date(u.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    value: u.value,
  }));

  const metrics = data.metrics;
  const summaryItems = [
    { label: 'Выручка', value: fmtRub(metrics.totalRevenue.value), change: metrics.totalRevenue.change, trend: metrics.totalRevenue.trend },
    { label: 'Бронирования', value: String(metrics.totalBookings.value), change: metrics.totalBookings.change, trend: metrics.totalBookings.trend },
    { label: 'Пользователи', value: String(metrics.activeUsers.value), change: metrics.activeUsers.change, trend: metrics.activeUsers.trend },
    { label: 'Конверсия', value: `${metrics.conversionRate.value.toFixed(1)}%`, change: metrics.conversionRate.change, trend: metrics.conversionRate.trend },
    { label: 'Ср. чек', value: fmtRub(metrics.averageOrderValue?.value ?? 0), change: metrics.averageOrderValue?.change ?? 0, trend: metrics.averageOrderValue?.trend ?? 'neutral' },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Аналитика</h1>
          <span className="text-xs text-[var(--text-muted)] font-mono">90д</span>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Обновить
        </button>
      </div>

      {/* Сводка */}
      <div className="flex flex-wrap gap-3">
        {summaryItems.map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3 min-w-[140px]">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">{s.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-lg font-semibold text-[var(--text-primary)] font-mono">{s.value}</span>
              {s.trend !== 'neutral' && s.change !== 0 && (
                <span className={`text-[10px] font-mono ${s.trend === 'up' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {s.trend === 'up' ? '↑' : '↓'}{Math.abs(s.change).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <BarChart items={revenueItems.map(r => ({ ...r, value: Math.round(r.value) }))} label="Выручка по месяцам" />
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <BarChart items={categoryItems} label="Бронирования по категориям" />
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <BarChart items={userItems} label="Рост пользователей (последние 14 дней)" />
        </div>

        {/* Топ туры повторно в табличном виде */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Топ-5 туров по выручке</p>
          <div className="space-y-2">
            {data.charts.topTours.map((tour, idx) => (
              <div key={tour.id} className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--text-muted)] w-4">{idx + 1}</span>
                <span className="text-xs text-[var(--text-primary)] flex-1 truncate">{tour.title}</span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">{tour.bookings}b</span>
                <span className="text-xs font-mono text-[var(--text-primary)] font-medium">{fmtRub(tour.revenue)}</span>
              </div>
            ))}
            {data.charts.topTours.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">Нет данных</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
