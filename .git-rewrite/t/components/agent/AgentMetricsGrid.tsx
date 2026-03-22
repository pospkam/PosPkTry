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
      icon: ' ',
      color: 'text-[var(--accent)]'
    },
    {
      label: 'Активные брони',
      value: metrics.activeBookings,
      icon: ' ',
      color: 'text-[var(--accent)]'
    },
    {
      label: 'Комиссия (всего)',
      value: `${metrics.totalCommission.toLocaleString('ru-RU')} ₽`,
      icon: ' ',
      color: 'text-[var(--success)]'
    },
    {
      label: 'Комиссия (месяц)',
      value: `${metrics.monthlyCommission.toLocaleString('ru-RU')} ₽`,
      icon: ' ',
      color: 'text-[var(--accent)]'
    },
    {
      label: 'Конверсия',
      value: `${metrics.conversionRate.toFixed(1)}%`,
      icon: ' ',
      color: 'text-purple-400'
    },
    {
      label: 'Средний чек',
      value: `${metrics.avgDealValue.toLocaleString('ru-RU')} ₽`,
      icon: '',
      color: 'text-[var(--warning)]'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metricCards.map((metric) => (
        <div
          key={metric.label}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-4xl">{metric.icon}</span>
            <div className={`text-3xl font-bold ${metric.color}`}>
              {metric.value}
            </div>
          </div>
          <div className="text-[var(--text-muted)] text-sm">{metric.label}</div>
        </div>
      ))}
    </div>
  );
}
