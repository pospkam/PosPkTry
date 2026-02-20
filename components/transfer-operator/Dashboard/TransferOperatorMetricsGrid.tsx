'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Car, Users, Route, CheckCircle, DollarSign, LucideIcon } from 'lucide-react';

interface TransferOperatorMetricsGridProps {
  period: string;
}

interface Metrics {
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  availableDrivers: number;
  activeRoutes: number;
  completedTransfers: number;
}

export function TransferOperatorMetricsGrid({ period }: TransferOperatorMetricsGridProps) {
  const [metrics, setMetrics] = useState<Metrics>({
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
      console.error('Error fetching transfer operator metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards: { label: string; value: number | string; icon: LucideIcon; color: string }[] = [
    {
      label: 'Всего бронирований',
      value: metrics.totalBookings,
      icon: Calendar,
      color: 'text-premium-gold'
    },
    {
      label: 'Активные',
      value: metrics.activeBookings,
      icon: Car,
      color: 'text-blue-400'
    },
    {
      label: 'Доступно водителей',
      value: metrics.availableDrivers,
      icon: Users,
      color: 'text-green-400'
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
      color: 'text-green-400'
    },
    {
      label: 'Общий доход',
      value: `${metrics.totalRevenue.toLocaleString('ru-RU')} ₽`,
      icon: DollarSign,
      color: 'text-premium-gold'
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, skeletonIdx) => (
          <div
            key={`skeleton-${skeletonIdx}`}
            className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse"
          >
            <div className="h-12 bg-white/10 rounded mb-3"></div>
            <div className="h-4 bg-white/10 rounded w-2/3"></div>
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
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-8 h-8 text-white/50" />
              <div className={`text-3xl font-black ${metric.color}`}>
                {metric.value}
              </div>
            </div>
            <div className="text-white/70 text-sm">{metric.label}</div>
          </div>
        );
      })}
    </div>
  );
}