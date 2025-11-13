'use client';

// ===========================================
// ВЫБОР ВРЕМЕНИ (TimeSlotPicker)
// KamHub - Time Slot Picker Component
// ===========================================

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
      <div className={clsx('text-center py-12', className)}>
        <div className="text-white/50 text-lg mb-2"></div>
        <div className="text-white/70">Нет доступных слотов времени</div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="text-white font-medium mb-4">
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
            className={clsx(
              'w-full p-4 rounded-xl border-2 transition-all text-left',
              {
                'bg-premium-gold border-premium-gold': isSelected,
                'bg-white/5 border-white/10 hover:border-premium-gold hover:bg-white/10': !isSelected && !isSoldOut,
                'bg-white/5 border-white/5 opacity-50 cursor-not-allowed': isSoldOut,
              }
            )}
          >
            <div className="flex items-center justify-between mb-2">
              {/* Время */}
              <div className={clsx(
                'text-lg font-bold',
                isSelected ? 'text-premium-black' : 'text-white'
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
                <span className="text-red-400 text-sm font-medium">
                  SOLD OUT
                </span>
              )}
            </div>

            {/* Детали */}
            <div className="flex items-center justify-between text-sm">
              {/* Места */}
              {!isSoldOut && (
                <span className={clsx(
                  isSelected ? 'text-premium-black/70' : 'text-white/70'
                )}>
                  🪑 {slot.available} {slot.available === 1 ? 'место' : slot.available <= 4 ? 'места' : 'мест'}
                </span>
              )}

              {/* Цена */}
              <span className={clsx(
                'font-bold',
                isSelected ? 'text-premium-black' : 'text-premium-gold'
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

export default TimeSlotPicker;



