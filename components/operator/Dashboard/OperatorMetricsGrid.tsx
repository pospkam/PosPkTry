'use client';

import React from 'react';
import { MetricCard } from '@/components/admin/shared';
import { OperatorMetrics } from '@/types/operator';

interface OperatorMetricsGridProps {
  metrics: OperatorMetrics;
  loading?: boolean;
}

export function OperatorMetricsGrid({ metrics, loading = false }: OperatorMetricsGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const calculateTrend = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Активные туры */}
      <MetricCard
        title="Активные туры"
        value={metrics.activeTours}
        icon=""
        loading={loading}
        change={metrics.totalTours > 0 ? calculateTrend(metrics.activeTours, metrics.totalTours) : 0}
        trend={metrics.activeTours > 0 ? 'up' : 'neutral'}
      />

      {/* Всего бронирований */}
      <MetricCard
        title="Всего бронирований"
        value={metrics.totalBookings}
        icon=""
        loading={loading}
        change={metrics.pendingBookings}
        trend="neutral"
      />

      {/* Подтверждённые */}
      <MetricCard
        title="Подтверждено"
        value={metrics.confirmedBookings}
        icon="[OK]"
        loading={loading}
        change={metrics.totalBookings > 0 ? calculateTrend(metrics.confirmedBookings, metrics.totalBookings) : 0}
        trend="up"
      />

      {/* Ожидают */}
      <MetricCard
        title="Ожидают подтверждения"
        value={metrics.pendingBookings}
        icon=""
        loading={loading}
        trend={metrics.pendingBookings > 5 ? 'up' : 'neutral'}
      />

      {/* Общая выручка */}
      <MetricCard
        title="Общая выручка"
        value={formatCurrency(metrics.totalRevenue)}
        icon=""
        loading={loading}
        trend="up"
      />

      {/* Выручка за месяц */}
      <MetricCard
        title="Выручка за месяц"
        value={formatCurrency(metrics.monthlyRevenue)}
        icon=""
        loading={loading}
        change={metrics.totalRevenue > 0 ? calculateTrend(metrics.monthlyRevenue, metrics.totalRevenue) : 0}
        trend={metrics.monthlyRevenue > 0 ? 'up' : 'neutral'}
      />

      {/* Средний рейтинг */}
      <MetricCard
        title="Средний рейтинг"
        value={`${metrics.averageRating.toFixed(1)} `}
        icon=""
        loading={loading}
        trend={metrics.averageRating >= 4.5 ? 'up' : metrics.averageRating >= 4.0 ? 'neutral' : 'down'}
      />

      {/* Отзывы */}
      <MetricCard
        title="Всего отзывов"
        value={metrics.totalReviews}
        icon=""
        loading={loading}
        trend="neutral"
      />
    </div>
  );
}



