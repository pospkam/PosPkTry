'use client';

/**
 * AvailabilityIndicator — индикатор доступности мест для Kamchatour Hub
 * @param {AvailabilityIndicatorProps} props
 * @returns {JSX.Element}
 * @remarks
 * - Accessibility: aria-label для индикатора, role для контейнера, aria-live для динамического текста
 */

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
    <div className={clsx('flex items-center gap-2', className)} role="status" aria-label="Индикатор доступности мест">
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
        <span className="text-sm text-[var(--text-secondary)]" aria-live="polite">{text}</span>
      )}

      {/* Количество мест */}
      {showCount && (
        <span className="text-sm text-[var(--text-secondary)]" aria-live="polite">
          {available > 0 ? `${available} из ${total}` : 'Нет мест'}
        </span>
      )}
    </div>
  );
};

// AvailabilityIndicator — используй именованный импорт: { AvailabilityIndicator }



