'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Calendar, DollarSign, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/shared';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface DashboardMetrics {
  totalItems: number;
  availableItems: number;
  activeRentals: number;
  totalRevenue: number;
  averageRating: number;
  pendingReturns: number;
}

const EMPTY_METRICS: DashboardMetrics = {
  totalItems: 0,
  availableItems: 0,
  activeRentals: 0,
  totalRevenue: 0,
  averageRating: 0,
  pendingReturns: 0,
};

export default function GearProviderDashboardClient() {
  const { data: metrics, loading } = useApiFetch<{ metrics?: DashboardMetrics }, DashboardMetrics>(
    '/api/gear-provider/dashboard',
    (d) => d?.metrics ?? EMPTY_METRICS,
  );

  const m = metrics ?? EMPTY_METRICS;

  if (loading) {
    return (
      <div className="p-5 lg:p-6 flex items-center justify-center min-h-[300px]">
        <LoadingSpinner message="Загрузка dashboard..." />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Dashboard проката</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Управление снаряжением и арендой</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          icon={Package}
          label="Всего позиций"
          value={m.totalItems}
          subValue={`${m.availableItems} доступно`}
          accentColor="var(--accent)"
        />
        <MetricCard
          icon={Calendar}
          label="Активные аренды"
          value={m.activeRentals}
          accentColor="var(--accent)"
        />
        <MetricCard
          icon={AlertCircle}
          label="Ожидают возврата"
          value={m.pendingReturns}
          accentColor="var(--warning)"
        />
        <MetricCard
          icon={DollarSign}
          label="Доход за месяц"
          value={`${m.totalRevenue.toLocaleString('ru-RU')} ₽`}
          accentColor="var(--success)"
        />
        <MetricCard
          icon={Star}
          label="Средний рейтинг"
          value={m.averageRating.toFixed(1)}
          accentColor="var(--warning)"
        />
        <MetricCard
          icon={TrendingUp}
          label="Загрузка"
          value={m.totalItems > 0
            ? `${Math.round((m.activeRentals / m.totalItems) * 100)}%`
            : '0%'}
          accentColor="var(--accent)"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Быстрые действия</h2>
          <div className="space-y-3">
            <Link
              href="/hub/gear-provider/items/new"
              className="block w-full px-4 py-2.5 text-sm font-medium text-center rounded-md bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90 transition-opacity"
            >
              Добавить снаряжение
            </Link>
            <Link
              href="/hub/gear-provider/bookings"
              className="block w-full px-4 py-2.5 text-sm text-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              Просмотреть бронирования
            </Link>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Последние бронирования</h2>
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            Нет активных бронирований
          </p>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  accentColor: string;
}

function MetricCard({ icon: Icon, label, value, subValue, accentColor }: MetricCardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-6 h-6 text-[var(--text-muted)]" />
        <div className="text-2xl font-bold" style={{ color: accentColor }}>{value}</div>
      </div>
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
      {subValue && <div className="text-xs text-[var(--text-muted)] mt-1">{subValue}</div>}
    </div>
  );
}
