'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  loading = false,
  className
}: MetricCardProps) {
  const getTrendColor = () => {
    if (!change) return 'text-white/70';
    if (trend === 'up') return 'text-green-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-white/70';
  };

  const getTrendIcon = () => {
    if (!change) return null;
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  if (loading) {
    return (
      <div className={clsx(
        'bg-white/5 border border-white/10 rounded-2xl p-6',
        'animate-pulse',
        className
      )}>
        <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-white/10 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'bg-white/5 border border-white/10 rounded-2xl p-6',
      'hover:border-premium-gold/30 transition-all duration-300',
      'group',
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm text-white/70 mb-1">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {change !== undefined && (
              <span className={clsx(
                'text-sm font-bold',
                getTrendColor()
              )}>
                {getTrendIcon()} {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className="text-4xl opacity-50 group-hover:opacity-100 transition-opacity">
            {icon}
          </div>
        )}
      </div>
      
      {change !== undefined && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-white/50">
            {trend === 'up' && 'Рост по сравнению с прошлым периодом'}
            {trend === 'down' && 'Снижение по сравнению с прошлым периодом'}
            {trend === 'neutral' && 'Без изменений'}
          </p>
        </div>
      )}
    </div>
  );
}

