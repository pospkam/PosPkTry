'use client';

import React from 'react';

interface AgentMetricsGridProps {
  metrics: {
    totalClients: number;
    activeBookings: number;
    totalCommission: number;
    monthlyCommission: number;
    conversionRate: number;
    avgDealValue: number;
  };
}

export function AgentMetricsGrid({ metrics }: AgentMetricsGridProps) {
  const metricCards = [
    {
      label: 'Всего клиентов',
      value: metrics.totalClients,
      icon: '👥',
      color: 'text-premium-gold'
    },
    {
      label: 'Активные брони',
      value: metrics.activeBookings,
      icon: '📅',
      color: 'text-blue-400'
    },
    {
      label: 'Комиссия (всего)',
      value: `${metrics.totalCommission.toLocaleString('ru-RU')} ₽`,
      icon: '💰',
      color: 'text-green-400'
    },
    {
      label: 'Комиссия (месяц)',
      value: `${metrics.monthlyCommission.toLocaleString('ru-RU')} ₽`,
      icon: '📈',
      color: 'text-premium-gold'
    },
    {
      label: 'Конверсия',
      value: `${metrics.conversionRate.toFixed(1)}%`,
      icon: '🎯',
      color: 'text-purple-400'
    },
    {
      label: 'Средний чек',
      value: `${metrics.avgDealValue.toLocaleString('ru-RU')} ₽`,
      icon: '💎',
      color: 'text-yellow-400'
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
