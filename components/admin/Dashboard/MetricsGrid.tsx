'use client';

import React from 'react';
import { MetricCard } from '@/components/admin/shared';
import { DashboardMetrics } from '@/types/admin';

interface MetricsGridProps {
  metrics: DashboardMetrics;
  loading?: boolean;
}

export function MetricsGrid({ metrics, loading = false }: MetricsGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <MetricCard
        title="Общая выручка"
        value={formatCurrency(metrics.totalRevenue.value)}
        change={metrics.totalRevenue.change}
        trend={metrics.totalRevenue.trend}
        icon=""
        loading={loading}
      />
      
      <MetricCard
        title="Всего бронирований"
        value={formatNumber(metrics.totalBookings.value)}
        change={metrics.totalBookings.change}
        trend={metrics.totalBookings.trend}
        icon=""
        loading={loading}
      />
      
      <MetricCard
        title="Активные пользователи"
        value={formatNumber(metrics.activeUsers.value)}
        change={metrics.activeUsers.change}
        trend={metrics.activeUsers.trend}
        icon=""
        loading={loading}
      />
      
      <MetricCard
        title="Конверсия"
        value={formatPercent(metrics.conversionRate.value)}
        change={metrics.conversionRate.change}
        trend={metrics.conversionRate.trend}
        icon=""
        loading={loading}
      />
      
      <MetricCard
        title="Средний чек"
        value={formatCurrency(metrics.averageOrderValue.value)}
        change={metrics.averageOrderValue.change}
        trend={metrics.averageOrderValue.trend}
        icon=""
        loading={loading}
      />
      
      <MetricCard
        title="Темп роста"
        value={formatPercent(metrics.growthRate.value)}
        change={metrics.growthRate.change}
        trend={metrics.growthRate.trend}
        icon=""
        loading={loading}
      />
    </div>
  );
}



