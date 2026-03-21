'use client';

/**
 * TimeSlotPicker — компонент выбора времени для Kamchatour Hub
 * @param {TimeSlotPickerProps} props
 * @returns {JSX.Element}
 * @remarks
 * - Accessibility: aria-label для кнопок, role для контейнера, aria-disabled для недоступных слотов
 * - UX: визуальное выделение выбранного и недоступного слота
 */

import React, { useState } from 'react';
import clsx from 'clsx';
import { AvailabilityIndicator } from './AvailabilityIndicator';
import { formatPrice, formatDuration, type TimeSlot } from '../calendars/calendar-utils';

export interface TimeSlotPickerProps {
  // Доступные слоты
  slots: TimeSlot[];

  // Callback при выборе
  onSelect: (slot: TimeSlot) => void;

  // Выбранный слот
  selectedSlotId?: string;

  // UI
  className?: string;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  onSelect,
  selectedSlotId,
  className,
}) => {
  const [selected, setSelected] = useState<string | undefined>(selectedSlotId);

  const handleSelect = (slot: TimeSlot) => {
    if (slot.available === 0) return;

    setSelected(slot.id);
    onSelect(slot);
  };

  if (slots.length === 0) {
    return (
      <div className={clsx('text-center py-12', className)} role="status" aria-label="Нет доступных слотов времени">
        <div className="text-[var(--text-muted)] text-lg mb-2"></div>
        <div className="text-[var(--text-secondary)]">Нет доступных слотов времени</div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)} role="group" aria-label="Выбор времени">
      <div className="text-[var(--text-primary)] font-medium mb-4">
        Выберите время:
      </div>

      {slots.map((slot) => {
        const isSelected = selected === slot.id;
        const isSoldOut = slot.available === 0;

        return (
          <button
            key={slot.id}
            onClick={() => handleSelect(slot)}
            disabled={isSoldOut}
            aria-label={`Время: ${slot.time}, ${isSoldOut ? 'недоступно' : isSelected ? 'выбрано' : 'доступно'}`}
            aria-disabled={isSoldOut}
            className={clsx(
              'w-full p-4 rounded-xl border-2 transition-all text-left',
              {
                'bg-[var(--accent)] border-[var(--accent)]': isSelected,
                'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]': !isSelected && !isSoldOut,
                'bg-[var(--bg-card)] border-[var(--border)] opacity-50 cursor-not-allowed': isSoldOut,
              }
            )}
          >
            <div className="flex items-center justify-between mb-2">
              {/* Время */}
              <div className={clsx(
                'text-lg font-bold',
                isSelected ? 'text-[var(--bg-primary)]' : 'text-[var(--text-primary)]'
              )}>
                {slot.displayTime}
              </div>

              {/* Индикатор доступности */}
              {!isSoldOut ? (
                <AvailabilityIndicator
                  available={slot.available}
                  total={slot.total}
                  size="md"
                />
              ) : (
                <span className="text-[var(--danger)] text-sm font-medium">
                  SOLD OUT
                </span>
              )}
            </div>

            {/* Детали */}
            <div className="flex items-center justify-between text-sm">
              {/* Места */}
              {!isSoldOut && (
                <span className={clsx(
                  isSelected ? 'text-[var(--bg-primary)]' : 'text-[var(--text-secondary)]'
                )}>
                  Места: {slot.available} {slot.available === 1 ? 'место' : slot.available <= 4 ? 'места' : 'мест'}
                </span>
              )}

              {/* Цена */}
              <span className={clsx(
                'font-bold',
                isSelected ? 'text-[var(--bg-primary)]' : 'text-[var(--accent)]'
              )}>
                {formatPrice(slot.price)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// TimeSlotPicker — используй именованный импорт: { TimeSlotPicker }



