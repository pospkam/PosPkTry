'use client';

import React from 'react';
import { clsx } from 'clsx';
import { BarChart3 } from 'lucide-react';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleChartProps {
  title: string;
  data: ChartDataPoint[];
  type?: 'bar' | 'line';
  valueFormatter?: (value: number) => string;
  loading?: boolean;
  className?: string;
}

export function SimpleChart({
  title,
  data,
  type = 'bar',
  valueFormatter = (v) => v.toString(),
  loading = false,
  className
}: SimpleChartProps) {
  if (loading) {
    return (
      <div className={clsx('bg-white/5 border border-white/10 rounded-2xl p-6', className)}>
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <div className="animate-pulse h-64 bg-white/10 rounded"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={clsx('bg-white/5 border border-white/10 rounded-2xl p-6', className)}>
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-white/50">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 text-white/30" />
            <p>Нет данных</p>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className={clsx('bg-white/5 border border-white/10 rounded-2xl p-6', className)}>
      <h3 className="text-lg font-bold text-white mb-6">{title}</h3>
      
      {type === 'bar' && (
        <div className="space-y-4">
          {data.map((point, index) => {
            const percentage = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/70">{point.label}</span>
                  <span className="text-sm font-bold text-white">
                    {valueFormatter(point.value)}
                  </span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      point.color || 'bg-premium-gold'
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {type === 'line' && (
        <div className="relative h-64">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-white/50">
            <span>{valueFormatter(maxValue)}</span>
            <span>{valueFormatter(maxValue / 2)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-14 h-full relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-white/5" />
              ))}
            </div>

            {/* Data points and lines */}
            <div className="absolute inset-0 flex items-end justify-between">
              {data.map((point, index) => {
                const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="relative w-full flex items-end justify-center" style={{ height: '100%' }}>
                      {/* Point */}
                      <div
                        className="w-3 h-3 bg-premium-gold rounded-full absolute bottom-0 transform translate-y-1/2"
                        style={{ bottom: `${height}%` }}
                        title={`${point.label}: ${valueFormatter(point.value)}`}
                      />
                      {/* Vertical line */}
                      <div
                        className="w-0.5 bg-premium-gold/30 absolute bottom-0"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-white/50">
              {data.map((point, index) => (
                <span key={index} className="transform -rotate-45 origin-left">
                  {point.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



