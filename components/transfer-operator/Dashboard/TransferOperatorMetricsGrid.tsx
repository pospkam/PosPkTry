'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Car, Users, Route, CheckCircle, DollarSign, LucideIcon } from 'lucide-react';

interface TransferOperatorMetricsGridProps {
  period?: string;
  metrics?: {
    totalBookings: number;
    activeBookings: number;
    totalRevenue: number;
    availableDrivers: number;
    activeRoutes: number;
    completedTransfers: number;
  };
}

interface Metrics {
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  availableDrivers: number;
  activeRoutes: number;
  completedTransfers: number;
}

export function TransferOperatorMetricsGrid({ period = '30', metrics: metricsProp }: TransferOperatorMetricsGridProps) {
  const [metrics, setMetrics] = useState<Metrics>(metricsProp || {
    totalBookings: 0,
    activeBookings: 0,
    totalRevenue: 0,
    availableDrivers: 0,
    activeRoutes: 0,
    completedTransfers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transfers/operator/dashboard?period=${period}`);
      const data = await response.json();
      
      if (data.success && data.data?.metrics) {
        setMetrics(data.data.metrics);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const metricCards: { label: string; value: number | string; icon: LucideIcon; color: string }[] = [
    {
      label: 'Всего бронирований',
      value: metrics.totalBookings,
      icon: Calendar,
      color: 'text-[var(--accent)]'
    },
    {
      label: 'Активные',
      value: metrics.activeBookings,
      icon: Car,
      color: 'text-[var(--accent)]'
    },
    {
      label: 'Доступно водителей',
      value: metrics.availableDrivers,
      icon: Users,
      color: 'text-[var(--success)]'
    },
    {
      label: 'Активные маршруты',
      value: metrics.activeRoutes,
      icon: Route,
      color: 'text-purple-400'
    },
    {
      label: 'Завершено',
      value: metrics.completedTransfers,
      icon: CheckCircle,
      color: 'text-[var(--success)]'
    },
    {
      label: 'Общий доход',
      value: `${metrics.totalRevenue.toLocaleString('ru-RU')} ₽`,
      icon: DollarSign,
      color: 'text-[var(--accent)]'
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, skeletonIdx) => (
          <div
            key={`skeleton-${skeletonIdx}`}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 animate-pulse"
          >
            <div className="h-12 bg-[var(--bg-card)] rounded mb-3"></div>
            <div className="h-4 bg-[var(--bg-card)] rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metricCards.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-8 h-8 text-[var(--text-muted)]" />
              <div className={`text-3xl font-bold ${metric.color}`}>
                {metric.value}
              </div>
            </div>
            <div className="text-[var(--text-muted)] text-sm">{metric.label}</div>
          </div>
        );
      })}
    </div>
  );
}