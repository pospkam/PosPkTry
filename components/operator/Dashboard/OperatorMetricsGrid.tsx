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
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {trend && change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-400' : 
            trend === 'down' ? 'text-red-400' : 
            'text-white/50'
          }`}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {change}%
          </div>
        )}
      </div>
      <div className="text-3xl font-black text-white mb-1">
        {value}{suffix}
      </div>
      <div className="text-sm text-white/60">{title}</div>
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
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white/10 rounded-2xl p-6 animate-pulse">
            <div className="w-12 h-12 bg-white/20 rounded-xl mb-4" />
            <div className="h-8 bg-white/20 rounded w-20 mb-2" />
            <div className="h-4 bg-white/10 rounded w-32" />
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
        iconColor="text-emerald-400"
        bgColor="bg-emerald-500/20"
        trend={metrics.activeTours > 0 ? 'up' : 'neutral'}
        change={calculateTrend(metrics.activeTours, metrics.totalTours)}
      />

      <MetricCard
        title="Всего бронирований"
        value={metrics.totalBookings}
        icon={CalendarCheck}
        iconColor="text-blue-400"
        bgColor="bg-blue-500/20"
      />

      <MetricCard
        title="Подтверждено"
        value={metrics.confirmedBookings}
        icon={CheckCircle}
        iconColor="text-green-400"
        bgColor="bg-green-500/20"
        trend="up"
        change={calculateTrend(metrics.confirmedBookings, metrics.totalBookings)}
      />

      <MetricCard
        title="Ожидают подтверждения"
        value={metrics.pendingBookings}
        icon={Clock}
        iconColor="text-amber-400"
        bgColor="bg-amber-500/20"
        trend={metrics.pendingBookings > 5 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Общая выручка"
        value={formatCurrency(metrics.totalRevenue)}
        icon={Wallet}
        iconColor="text-premium-gold"
        bgColor="bg-premium-gold/20"
        suffix=" ₽"
      />

      <MetricCard
        title="Выручка за месяц"
        value={formatCurrency(metrics.monthlyRevenue)}
        icon={TrendingUp}
        iconColor="text-cyan-400"
        bgColor="bg-cyan-500/20"
        suffix=" ₽"
        trend={metrics.monthlyRevenue > 0 ? 'up' : 'neutral'}
        change={calculateTrend(metrics.monthlyRevenue, metrics.totalRevenue)}
      />

      <MetricCard
        title="Средний рейтинг"
        value={metrics.averageRating.toFixed(1)}
        icon={Star}
        iconColor="text-yellow-400"
        bgColor="bg-yellow-500/20"
        trend={metrics.averageRating >= 4.5 ? 'up' : metrics.averageRating >= 4.0 ? 'neutral' : 'down'}
      />

      <MetricCard
        title="Всего отзывов"
        value={metrics.totalReviews}
        icon={MessageSquare}
        iconColor="text-purple-400"
        bgColor="bg-purple-500/20"
      />
    </div>
  );
}
