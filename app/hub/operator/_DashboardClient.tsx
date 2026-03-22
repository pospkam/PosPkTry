'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Calendar, Users, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';

interface Tour {
  id: number;
  title: string;
  base_price: number;
  activity_type: string;
  bookings_count: number;
}

interface Metrics {
  revenue_7d: string;
  bookings_7d: string;
  tours_active: string;
  avg_booking_value: string;
}

export default function OperatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState<Tour[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [toursRes, metricsRes] = await Promise.all([
          fetch('/api/hub/operator/tours'),
          fetch('/api/hub/operator/metrics/7d')
        ]);

        if (toursRes.ok) {
          const data = await toursRes.json();
          setTours(data.tours || []);
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data.metrics);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const StatCard = ({ icon: Icon, title, value }: any) => (
    <div className="ds-card p-4 flex items-start gap-3">
      <Icon className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-1" />
      <div>
        <p className="text-sm text-[var(--text-secondary)]">{title}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--text-muted)]">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="ds-h1">Мой кабинет</h1>
        </div>
        <Link href="/hub/operator/tours/new" className="ds-btn ds-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Добавить тур
        </Link>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} title="Доход (7д)" value={`${metrics.revenue_7d} ₽`} />
          <StatCard icon={Calendar} title="Букировки" value={metrics.bookings_7d} />
          <StatCard icon={BarChart3} title="Туры активные" value={metrics.tours_active} />
          <StatCard icon={Users} title="Средняя стоимость" value={`${metrics.avg_booking_value} ₽`} />
        </div>
      )}

      {/* Tours List */}
      <div className="ds-card p-6">
        <h2 className="ds-h2 mb-4">Мои туры</h2>

        {tours.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)] mb-4">У тебя пока нет туров</p>
            <Link href="/hub/operator/tours/new" className="ds-btn ds-btn-primary">
              Добавить первый тур
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-3 text-[var(--text-secondary)]">Название</th>
                  <th className="text-left p-3 text-[var(--text-secondary)]">Тип</th>
                  <th className="text-left p-3 text-[var(--text-secondary)]">Цена</th>
                  <th className="text-left p-3 text-[var(--text-secondary)]">Букировок</th>
                  <th className="text-left p-3 text-[var(--text-secondary)]">Действия</th>
                </tr>
              </thead>
              <tbody>
                {tours.map(tour => (
                  <tr key={tour.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
                    <td className="p-3 font-medium text-[var(--text-primary)]">{tour.title}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{tour.activity_type}</td>
                    <td className="p-3 text-[var(--text-primary)] font-semibold">{tour.base_price} ₽</td>
                    <td className="p-3 text-[var(--accent)]">{tour.bookings_count}</td>
                    <td className="p-3">
                      <Link
                        href={`/hub/operator/tours/${tour.id}`}
                        className="text-[var(--ocean)] hover:underline text-xs"
                      >
                        Редактировать
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/hub/operator/calendar" className="ds-card p-6 hover:bg-[var(--bg-hover)] transition">
          <h3 className="ds-h2 text-base mb-2">📅 Календарь</h3>
          <p className="text-sm text-[var(--text-secondary)]">Управлять датами туров</p>
        </Link>
        <Link href="/hub/operator/bookings" className="ds-card p-6 hover:bg-[var(--bg-hover)] transition">
          <h3 className="ds-h2 text-base mb-2">📝 Букировки</h3>
          <p className="text-sm text-[var(--text-secondary)]">Посмотреть все букировки</p>
        </Link>
        <Link href="/hub/operator/finance" className="ds-card p-6 hover:bg-[var(--bg-hover)] transition">
          <h3 className="ds-h2 text-base mb-2">💰 Финансы</h3>
          <p className="text-sm text-[var(--text-secondary)]">История платежей и выплат</p>
        </Link>
      </div>
    </div>
  );
}
