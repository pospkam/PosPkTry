'use client';

import React from 'react';
import { OperatorMetrics } from '@/types/operator';
import {
  Mountain,
  CalendarCheck,
  Clock,
  CheckCircle,
  Wallet,
  TrendingUp,
  Star,
  MessageSquare,
  Zap,
  LucideIcon
} from 'lucide-react';

interface OperatorMetricsGridProps {
  metrics: OperatorMetrics;
  loading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: number;
  suffix?: string;
}

function MetricCard({ title, value, icon: Icon, iconColor, bgColor, trend, change, suffix }: MetricCardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 hover:bg-[var(--bg-hover)] transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {trend && change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-[var(--success)]' :
            trend === 'down' ? 'text-[var(--danger)]' :
            'text-[var(--text-muted)]'
          }`}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {change}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
        {value}{suffix}
      </div>
      <div className="text-sm text-[var(--text-muted)]">{title}</div>
    </div>
  );
}

export function OperatorMetricsGrid({ metrics, loading = false }: OperatorMetricsGridProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString('ru-RU');
  };

  const calculateTrend = (current: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, metricIndex) => (
          <div key={`skeleton-${metricIndex}`} className="bg-[var(--bg-card)] rounded-lg p-6 animate-pulse">
            <div className="w-12 h-12 bg-[var(--bg-hover)] rounded-xl mb-4" />
            <div className="h-8 bg-[var(--bg-hover)] rounded w-20 mb-2" />
            <div className="h-4 bg-[var(--bg-card)] rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Активные туры"
        value={metrics.activeTours}
        icon={Mountain}
        iconColor="text-[var(--success)]"
        bgColor="bg-[var(--success)]/10"
        trend={metrics.activeTours > 0 ? 'up' : 'neutral'}
        change={calculateTrend(metrics.activeTours, metrics.totalTours)}
      />

      <MetricCard
        title="Всего бронирований"
        value={metrics.totalBookings}
        icon={CalendarCheck}
        iconColor="text-[var(--accent)]"
        bgColor="bg-[var(--accent)]/10"
      />

      <MetricCard
        title="Подтверждено"
        value={metrics.confirmedBookings}
        icon={CheckCircle}
        iconColor="text-[var(--success)]"
        bgColor="bg-[var(--success)]/10"
        trend="up"
        change={calculateTrend(metrics.confirmedBookings, metrics.totalBookings)}
      />

      <MetricCard
        title="Ожидают подтверждения"
        value={metrics.pendingBookings}
        icon={Clock}
        iconColor="text-[var(--warning)]"
        bgColor="bg-[var(--warning)]/10"
        trend={metrics.pendingBookings > 5 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Общая выручка"
        value={formatCurrency(metrics.totalRevenue)}
        icon={Wallet}
        iconColor="text-[var(--accent)]"
        bgColor="bg-[var(--accent)]/10"
        suffix=" ₽"
      />

      <MetricCard
        title="Выручка за месяц"
        value={formatCurrency(metrics.monthlyRevenue)}
        icon={TrendingUp}
        iconColor="text-[var(--accent)]"
        bgColor="bg-[var(--accent)]/10"
        suffix=" ₽"
        trend={metrics.monthlyRevenue > 0 ? 'up' : 'neutral'}
        change={calculateTrend(metrics.monthlyRevenue, metrics.totalRevenue)}
      />

      <MetricCard
        title="Средний рейтинг"
        value={metrics.averageRating.toFixed(1)}
        icon={Star}
        iconColor="text-[var(--warning)]"
        bgColor="bg-[var(--warning)]/10"
        trend={metrics.averageRating >= 4.5 ? 'up' : metrics.averageRating >= 4.0 ? 'neutral' : 'down'}
      />

      <MetricCard
        title="Всего отзывов"
        value={metrics.totalReviews}
        icon={MessageSquare}
        iconColor="text-purple-400"
        bgColor="bg-purple-500/10"
      />

      <MetricCard
        title="Новых лидов сегодня"
        value={metrics.newLeadsToday ?? 0}
        icon={Zap}
        iconColor="text-[var(--ocean)]"
        bgColor="bg-[var(--ocean)]/10"
        trend={(metrics.newLeadsToday ?? 0) > 0 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Необработанных лидов"
        value={metrics.unprocessedLeads ?? 0}
        icon={Clock}
        iconColor={(metrics.unprocessedLeads ?? 0) > 0 ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}
        bgColor={(metrics.unprocessedLeads ?? 0) > 0 ? 'bg-[var(--warning)]/10' : 'bg-[var(--bg-hover)]'}
        trend={(metrics.unprocessedLeads ?? 0) > 3 ? 'up' : 'neutral'}
      />
    </div>
  );
}
