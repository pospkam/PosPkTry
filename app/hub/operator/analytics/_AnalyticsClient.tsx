'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, Users, Target, Calendar,
  RefreshCw, AlertTriangle,
} from 'lucide-react';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import { SimpleChart } from '@/components/admin/Dashboard/SimpleChart';

interface AnalyticsData {
  period: { days: number; start: string; end: string };
  summary: {
    totalRevenue: number;
    totalBookings: number;
    avgBookingValue: number;
    completedBookings: number;
  };
  revenue: Array<{ month: string; revenue: number; bookings: number }>;
  topTours: Array<{ id: string; title: string; bookings: number; revenue: number; avgPrice: number }>;
  conversion: { pageViews: number; bookings: number; rate: number };
  statusBreakdown: Record<string, number>;
}

const formatRub = (val: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(val);

const MetricCard = ({ icon: Icon, label, value, subtext }: any) => (
  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">{label}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        {subtext && <p className="text-xs text-[var(--text-muted)] mt-1">{subtext}</p>}
      </div>
      <Icon className="w-5 h-5 text-[var(--text-muted)]" />
    </div>
  </div>
);

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/operator/analytics?period=${period}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
  }, [period]);

  if (loading) return <div className="p-6"><LoadingSpinner message="Загрузка аналитики..." /></div>;

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10 text-[var(--warning)]" />}
          title="Ошибка"
          description={error}
          action={{ label: 'Повторить', onClick: fetchAnalytics }}
        />
      </div>
    );
  }

  if (!data) return null;

  const monthlyRevenue = data.revenue.map(r => ({
    label: new Date(r.month + 'T00:00:00').toLocaleDateString('ru-RU', { month: 'short' }),
    value: r.revenue / 1000,
  }));

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Аналитика</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="7">7 дней</option>
            <option value="30">30 дней</option>
            <option value="90">90 дней</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={DollarSign}
          label="Выручка"
          value={formatRub(data.summary.totalRevenue)}
          subtext={`${data.summary.totalBookings} бронирований`}
        />
        <MetricCard
          icon={Users}
          label="Всего бронирований"
          value={data.summary.totalBookings}
          subtext={`Завершено: ${data.summary.completedBookings}`}
        />
        <MetricCard
          icon={Target}
          label="Средний чек"
          value={formatRub(data.summary.avgBookingValue)}
          subtext="На одно бронирование"
        />
        <MetricCard
          icon={TrendingUp}
          label="Конверсия"
          value={`${data.conversion.rate.toFixed(2)}%`}
          subtext={`${data.conversion.pageViews} просмотров`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Выручка по месяцам (тыс. ₽)</p>
          <SimpleChart data={monthlyRevenue} type="bar" color="var(--accent)" />
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Статусы бронирований</p>
          <div className="space-y-2">
            {Object.entries(data.statusBreakdown).map(([status, count]) => {
              const labels: Record<string, string> = {
                new: 'Новые', confirmed: 'Подтверждены', completed: 'Завершены',
                cancelled: 'Отменены', no_show: 'Не явились',
              };
              const colors: Record<string, string> = {
                new: 'bg-[var(--warning)]', confirmed: 'bg-[var(--ocean)]',
                completed: 'bg-[var(--success)]', cancelled: 'bg-[var(--danger)]',
                no_show: 'bg-[var(--text-muted)]',
              };
              const total = Object.values(data.statusBreakdown).reduce((a: number, b: number) => a + b, 0);
              const percent = total > 0 ? ((count as number) / total) * 100 : 0;

              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--text-secondary)]">{labels[status] || status}</span>
                    <span className="text-xs font-medium text-[var(--text-primary)]">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div className={`h-full ${colors[status] || 'bg-[var(--accent)]'}`}
                      style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top tours */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Топ-5 туров по продажам</p>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
              <tr>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Тур</th>
                <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Бронирований</th>
                <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Выручка</th>
                <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Ср. чек</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.topTours.length > 0 ? (
                data.topTours.map(tour => (
                  <tr key={tour.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text-primary)]">{tour.title}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{tour.bookings}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-primary)] font-medium">{formatRub(tour.revenue)}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatRub(tour.avgPrice)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    Нет данных за выбранный период
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Period info */}
      <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
        <Calendar className="w-3 h-3" />
        Период: {data.period.start} — {data.period.end}
      </div>
    </div>
  );
}
