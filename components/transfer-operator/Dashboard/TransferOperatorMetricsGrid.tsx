'use client';

import React from 'react';

interface TransferOperatorMetricsGridProps {
  metrics: {
    totalBookings: number;
    activeBookings: number;
    totalRevenue: number;
    availableDrivers: number;
    activeRoutes: number;
    completedTransfers: number;
  };
}

export function TransferOperatorMetricsGrid({ metrics }: TransferOperatorMetricsGridProps) {
  const metricCards = [
    {
      label: 'Всего бронирований',
      value: metrics.totalBookings,
      icon: ' ',
      color: 'text-premium-gold'
    },
    {
      label: 'Активные',
      value: metrics.activeBookings,
      icon: ' ',
      color: 'text-blue-400'
    },
    {
      label: 'Доступно водителей',
      value: metrics.availableDrivers,
      icon: ' ',
      color: 'text-green-400'
    },
    {
      label: 'Активные маршруты',
      value: metrics.activeRoutes,
      icon: ' ',
      color: 'text-purple-400'
    },
    {
      label: 'Завершено',
      value: metrics.completedTransfers,
      icon: '[]',
      color: 'text-green-400'
    },
    {
      label: 'Общий доход',
      value: `${metrics.totalRevenue.toLocaleString('ru-RU')} ₽`,
      icon: ' ',
      color: 'text-premium-gold'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metricCards.map((metric, index) => (
        <div
          key={index}
          className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-4xl">{metric.icon}</span>
            <div className={`text-3xl font-black ${metric.color}`}>
              {metric.value}
            </div>
          </div>
          <div className="text-white/70 text-sm">{metric.label}</div>
        </div>
      ))}
    </div>
  );
}