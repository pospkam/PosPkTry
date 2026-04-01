'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OperatorMetricsGrid } from '@/components/operator/Dashboard/OperatorMetricsGrid';
import { RecentBookingsTable } from '@/components/operator/Dashboard/RecentBookingsTable';
import { TopToursTable } from '@/components/operator/Dashboard/TopToursTable';
import { SimpleChart } from '@/components/admin/Dashboard/SimpleChart';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import { MchsRegistrationPanel } from '@/components/operator/Dashboard/MchsRegistrationPanel';
import { OperatorEarningsCard } from '@/components/operator/OperatorEarningsCard';
import { OperatorDashboardData, OperatorBooking } from '@/types/operator';
import { AlertTriangle, BarChart3, Mountain, Calendar, Users, RefreshCw,
  CheckCircle2, Circle, ArrowRight, Plus } from 'lucide-react';

// ─── First-steps checklist for new operators ─────────────────────────────────

function FirstStepsPanel({ hasTours, onboardingDone }: { hasTours: boolean; onboardingDone: boolean }) {
  const steps = [
    {
      done: onboardingDone,
      label: 'Заполнить профиль компании',
      desc: 'Название, описание, контакты',
      href: '/hub/operator/onboarding',
      action: 'Заполнить',
    },
    {
      done: hasTours,
      label: 'Создать первый тур',
      desc: 'Название, цена, фото, маршрут',
      href: '/hub/operator/tours/new',
      action: 'Создать тур',
    },
    {
      done: false,
      label: 'Добавить даты проведения',
      desc: 'В разделе «Туры» → редактировать → Расписание',
      href: '/hub/operator/tours',
      action: 'К турам',
    },
    {
      done: false,
      label: 'Указать реквизиты для выплат',
      desc: 'СБП или расчётный счёт',
      href: '/hub/operator/finance',
      action: 'Настроить',
    },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="ds-card p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Первые шаги
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {doneCount} из {steps.length} выполнено
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--success)' }} />
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>{pct}%</span>
        </div>
      </div>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
            style={{ borderColor: s.done ? 'var(--success)/20' : 'var(--border)', background: s.done ? 'var(--success)/5' : 'transparent' }}>
            {s.done
              ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--success)' }} />
              : <Circle className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: s.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: s.done ? 'line-through' : 'none' }}>
                {s.label}
              </p>
              {!s.done && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>}
            </div>
            {!s.done && (
              <Link href={s.href} className="flex items-center gap-1 text-xs font-medium shrink-0 hover:underline"
                style={{ color: 'var(--accent)' }}>
                {s.action} <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OperatorDashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [onboardingDone, setOnboardingDone] = useState(true); // optimistic

  // Check onboarding status; redirect if not completed
  useEffect(() => {
    fetch('/api/hub/operator/profile')
      .then(r => r.json())
      .then((j: unknown) => {
        const profile = (j as { data?: { onboarding_completed?: boolean } }).data;
        const completed = profile?.onboarding_completed ?? false;
        setOnboardingDone(completed);
        if (!completed) router.replace('/hub/operator/onboarding');
      })
      .catch(() => {});
  }, [router]);

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
        <>
          <FirstStepsPanel hasTours={false} onboardingDone={onboardingDone} />
          <EmptyState
            icon={<BarChart3 className="w-10 h-10 text-[var(--text-muted)]" />}
            title="Нет данных"
            description="Данные не найдены"
          />
        </>
      ) : (
        <div className="space-y-5">
          {/* Show first-steps if no tours yet */}
          {data.topTours.length === 0 && (
            <FirstStepsPanel hasTours={false} onboardingDone={onboardingDone} />
          )}
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
              <div className="ds-card p-8 text-center">
                <Mountain className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Туров пока нет</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Создайте первый тур — это займёт 5 минут
                </p>
                <Link href="/hub/operator/tours/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ background: 'var(--accent)' }}>
                  <Plus className="w-4 h-4" /> Создать тур
                </Link>
              </div>
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
