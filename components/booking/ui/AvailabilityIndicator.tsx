'use client';

// ===========================================
// ИНДИКАТОР ДОСТУПНОСТИ
// KamHub - Availability Indicator Component
// ===========================================

import React from 'react';
import clsx from 'clsx';
import {
  getAvailabilityLevel,
  getAvailabilityColor,
  getAvailabilityText,
  type AvailabilityLevel
} from '../calendars/calendar-utils';

export interface AvailabilityIndicatorProps {
  // Количество доступных мест
  available: number;
  
  // Общее количество мест
  total: number;
  
  // Размер индикатора
  size?: 'sm' | 'md' | 'lg';
  
  // Показать текст
  showText?: boolean;
  
  // Показать количество
  showCount?: boolean;
  
  // UI
  className?: string;
}

export const AvailabilityIndicator: React.FC<AvailabilityIndicatorProps> = ({
  available,
  total,
  size = 'sm',
  showText = false,
  showCount = false,
  className,
}) => {
  const level: AvailabilityLevel = getAvailabilityLevel(available, total);
  const color = getAvailabilityColor(level);
  const text = getAvailabilityText(level);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {/* Индикатор */}
      <div
        className={clsx(
          'rounded-full',
          sizeClasses[size]
        )}
        style={{
          backgroundColor: color,
          boxShadow: `0 0 ${size === 'lg' ? '8px' : '4px'} ${color}`,
        }}
        aria-label={text}
      />

      {/* Текст */}
      {showText && (
        <span className="text-sm text-white/70">{text}</span>
      )}

      {/* Количество мест */}
      {showCount && (
        <span className="text-sm text-white/70">
          {available > 0 ? `${available} из ${total}` : 'Нет мест'}
        </span>
      )}
    </div>
  );
};

// AvailabilityIndicator — используй именованный импорт: { AvailabilityIndicator }



