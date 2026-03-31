'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { OperatorMetricsGrid } from '@/components/operator/Dashboard/OperatorMetricsGrid';
import { RecentBookingsTable } from '@/components/operator/Dashboard/RecentBookingsTable';
import { TopToursTable } from '@/components/operator/Dashboard/TopToursTable';
import { SimpleChart } from '@/components/admin/Dashboard/SimpleChart';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import { MchsRegistrationPanel } from '@/components/operator/Dashboard/MchsRegistrationPanel';
import { OperatorEarningsCard } from '@/components/operator/OperatorEarningsCard';
import { OperatorDashboardData, OperatorBooking } from '@/types/operator';
import { AlertTriangle, BarChart3, Mountain, Calendar, Users, RefreshCw } from 'lucide-react';

export default function OperatorDashboardClient() {
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/operator/dashboard?period=${period}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch data');
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void fetchDashboardData(); }, [fetchDashboardData]);

  const handleViewBookingDetails = (_booking: OperatorBooking) => {};

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Обзор оператора</h1>
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
            <option value="365">Год</option>
          </select>
          <button onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка данных..." />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10 text-[var(--warning)]" />}
          title="Ошибка загрузки"
          description={error}
          action={{ label: 'Повторить', onClick: fetchDashboardData }}
        />
      ) : !data ? (
        <EmptyState
          icon={<BarChart3 className="w-10 h-10 text-[var(--text-muted)]" />}
          title="Нет данных"
          description="Данные не найдены"
        />
      ) : (
        <div className="space-y-5">
          <OperatorMetricsGrid metrics={data.metrics} />
          <MchsRegistrationPanel />

          {/* Доходы и партнёрская монетизация */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Доходы за 30 дней</p>
            <OperatorEarningsCard />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Выручка</p>
              <SimpleChart data={data.revenueChart} type="bar" color="var(--accent)" />
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Бронирования</p>
              <SimpleChart data={data.bookingsChart} type="line" color="var(--success)" />
            </div>
          </div>

          {/* Upcoming tours */}
          {data.upcomingTours.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Предстоящие туры</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.upcomingTours.map(tour => (
                  <div key={`${tour.tourId}-${tour.date.toString()}`}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1 truncate">{tour.tourName}</p>
                    <p className="text-xs text-[var(--text-muted)] mb-3">
                      {new Date(tour.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                        <Users className="w-3 h-3" /> {tour.bookingsCount}/{tour.capacity}
                      </span>
                      <div className="w-20 bg-[var(--bg-hover)] rounded-full h-1.5">
                        <div className="bg-[var(--accent)] h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, (tour.bookingsCount / tour.capacity) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top tours */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Топ-5 туров</p>
            {data.topTours.length > 0 ? (
              <TopToursTable tours={data.topTours} />
            ) : (
              <EmptyState
                icon={<Mountain className="w-10 h-10 text-[var(--text-muted)]" />}
                title="Нет туров"
                description="Создайте свой первый тур"
              />
            )}
          </div>

          {/* Recent bookings */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Последние бронирования</p>
            {data.recentBookings.length > 0 ? (
              <RecentBookingsTable bookings={data.recentBookings} onViewDetails={handleViewBookingDetails} />
            ) : (
              <EmptyState
                icon={<Calendar className="w-10 h-10 text-[var(--text-muted)]" />}
                title="Нет бронирований"
                description="Бронирования появятся здесь"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
