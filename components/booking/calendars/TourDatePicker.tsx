'use client';

/**
 * TourDatePicker — календарь выбора даты тура для Kamchatour Hub
 * @param {TourDatePickerProps} props
 * @returns {JSX.Element}
 * @remarks
 * - Accessibility: role, aria-label для секций, aria-live для ошибок и динамических данных
 */

import React, { useState, useEffect } from 'react';
import { BaseCalendar } from './BaseCalendar';
import { AvailabilityIndicator } from '../ui/AvailabilityIndicator';
import { TimeSlotPicker } from '../ui/TimeSlotPicker';
import {
  formatDisplayDate,
  formatAPIDate,
  getAvailabilityLevel,
  type TimeSlot,
  type AvailabilityLevel
} from './calendar-utils';
import { isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export interface TourDatePickerProps {
  // ID тура
  tourId: string;
  
  // Тип тура
  tourType: 'group' | 'individual';
  
  // Длительность тура (в днях)
  duration: number;
  
  // Callback при выборе
  onDateSelect: (date: Date, timeSlot?: TimeSlot) => void;
  
  // Начальные значения
  initialDate?: Date | null;
  initialTimeSlotId?: string;
  
  // UI
  className?: string;
}

interface TourAvailableDate {
  date: string; // YYYY-MM-DD
  available: number;
  total: number;
  price: number;
  weather?: 'good' | 'windy' | 'rainy' | 'excellent';
}

interface TourTimeSlotsResponse {
  slots: TimeSlot[];
}

export const TourDatePicker: React.FC<TourDatePickerProps> = ({
  tourId,
  tourType,
  duration,
  onDateSelect,
  initialDate = null,
  initialTimeSlotId,
  className,
}) => {
  // Состояния
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [availableDates, setAvailableDates] = useState<TourAvailableDate[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка доступных дат для групповых туров
  useEffect(() => {
    if (tourType === 'group') {
      loadAvailableDates();
    }
  }, [tourId, tourType]);

  const loadAvailableDates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tours/${tourId}/available-dates`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить доступные даты');
      }

      const data = await response.json();
      setAvailableDates(data.dates || []);
    } catch (err) {
      toast.error('Не удалось загрузить календарь');
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка слотов времени при выборе даты (для индивидуальных туров)
  const loadTimeSlots = async (date: Date) => {
    setLoadingSlots(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tours/${tourId}/time-slots?date=${formatAPIDate(date)}`
      );

      if (!response.ok) {
        throw new Error('Не удалось загрузить слоты времени');
      }

      const data: TourTimeSlotsResponse = await response.json();
      setTimeSlots(data.slots || []);

      if (data.slots.length === 0) {
        toast.error('На эту дату нет доступных слотов');
      }
    } catch (err) {
      toast.error('Не удалось загрузить расписание');
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Обработка выбора даты
  const handleDateSelect = async (date: Date | [Date | null, Date | null] | null) => {
    const singleDate = Array.isArray(date) ? date[0] : date;
    if (!singleDate) {
      setSelectedDate(null);
      setTimeSlots([]);
      setSelectedTimeSlot(undefined);
      return;
    }
    const resolvedDate = singleDate;

    setSelectedDate(resolvedDate);

    // Для групповых туров - сразу callback
    if (tourType === 'group') {
      onDateSelect(resolvedDate);
    }
    // Для индивидуальных - загружаем слоты времени
    else {
      await loadTimeSlots(resolvedDate);
    }
  };

  // Обработка выбора слота времени
  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    if (selectedDate) {
      onDateSelect(selectedDate, slot);
    }
  };

  // Кастомный рендеринг дней календаря
  const renderDayContents = (dayOfMonth: number, date: Date) => {
    if (tourType !== 'group') {
      return dayOfMonth;
    }

    const dateInfo = availableDates.find(
      d => isSameDay(new Date(d.date), date)
    );

    if (!dateInfo) {
      return dayOfMonth;
    }

    const level: AvailabilityLevel = getAvailabilityLevel(
      dateInfo.available,
      dateInfo.total
    );

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{dayOfMonth}</span>
        <AvailabilityIndicator
          available={dateInfo.available}
          total={dateInfo.total}
          size="sm"
          className="absolute bottom-1 right-1"
        />
      </div>
    );
  };

  // Фильтр дат для групповых туров (только доступные даты)
  const includeDates = tourType === 'group' 
    ? availableDates.map(d => new Date(d.date))
    : undefined;

  // Информация о выбранной дате
  const selectedDateInfo = selectedDate && tourType === 'group'
    ? availableDates.find(d => isSameDay(new Date(d.date), selectedDate))
    : null;

  return (
    <div className={className} role="region" aria-label="Календарь выбора даты тура">
      {/* Информация о туре */}
      <div className="mb-6 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg" aria-label="Информация о туре">
        <div className="text-[var(--text-secondary)] text-sm mb-1">
          {tourType === 'group' ? 'Групповой тур' : 'Индивидуальный тур'}
        </div>
        <div className="text-[var(--text-primary)] font-medium">
          Длительность: {duration} {duration === 1 ? 'день' : duration <= 4 ? 'дня' : 'дней'}
        </div>
      </div>

      {/* Выбранная дата */}
      {selectedDate && (
        <div className="mb-6" aria-label="Выбранная дата">
          <span className="block text-sm text-[var(--text-secondary)] mb-2">
            Дата начала тура
          </span>
          <div className="px-4 py-3 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg text-[var(--text-primary)] font-medium" aria-live="polite">
            {formatDisplayDate(selectedDate)}
          </div>
        </div>
      )}

      {/* Календарь */}
      <BaseCalendar
        selected={selectedDate}
        onChange={handleDateSelect}
        minDate={new Date()}
        includeDates={includeDates}
        renderDayContents={renderDayContents}
        loading={loading}
        disabled={loading}
        monthsShown={1}
      />

      {/* Легенда для групповых туров */}
      {tourType === 'group' && !loading && (
        <div className="mt-4 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg" aria-label="Легенда доступности">
          <div className="text-[var(--text-secondary)] text-sm mb-3">Легенда:</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <AvailabilityIndicator available={15} total={20} size="sm" />
              <span className="text-[var(--text-secondary)]">Много мест (&gt;10)</span>
            </div>
            <div className="flex items-center gap-2">
              <AvailabilityIndicator available={7} total={20} size="sm" />
              <span className="text-[var(--text-secondary)]">Достаточно (5-10)</span>
            </div>
            <div className="flex items-center gap-2">
              <AvailabilityIndicator available={3} total={20} size="sm" />
              <span className="text-[var(--text-secondary)]">Мало мест (&lt;5)</span>
            </div>
            <div className="flex items-center gap-2">
              <AvailabilityIndicator available={0} total={20} size="sm" />
              <span className="text-[var(--text-secondary)]">Места закончились</span>
            </div>
          </div>
        </div>
      )}

      {/* Информация о выбранной дате (групповой тур) */}
      {selectedDateInfo && tourType === 'group' && (
        <div className="mt-6 p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg" aria-label="Информация о выбранной дате">
          <div className="text-[var(--text-primary)] font-medium mb-3">Информация о туре:</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Дата:</span>
              <span className="text-[var(--text-primary)]">{formatDisplayDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Длительность:</span>
              <span className="text-[var(--text-primary)]">{duration} {duration === 1 ? 'день' : duration <= 4 ? 'дня' : 'дней'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Осталось мест:</span>
              <span className="text-[var(--text-primary)] font-medium">
                {selectedDateInfo.available} из {selectedDateInfo.total}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Цена:</span>
              <span className="text-[var(--accent)] font-bold">
                {selectedDateInfo.price.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            {selectedDateInfo.weather && (
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Погода:</span>
                <span className="text-[var(--text-primary)]">
                  {getWeatherText(selectedDateInfo.weather)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Выбор времени (индивидуальный тур) */}
      {tourType === 'individual' && selectedDate && (
        <div className="mt-6" aria-label="Выбор времени для индивидуального тура">
          {loadingSlots ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-[var(--text-secondary)]">Загружаем расписание...</div>
            </div>
          ) : (
            <TimeSlotPicker
              slots={timeSlots}
              onSelect={handleTimeSlotSelect}
              selectedSlotId={selectedTimeSlot?.id}
            />
          )}
        </div>
      )}

      {/* Предупреждение о погоде */}
      {tourType === 'individual' && selectedDate && (
        <div className="mt-4 p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg text-sm text-[var(--warning)]" role="alert" aria-live="polite">
          ! Погодные условия проверяются за 24 часа до тура
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="mt-4 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg text-sm text-[var(--danger)]" role="alert" aria-live="assertive">
          ! {error}
        </div>
      )}
    </div>
  );
};

// Утилита для текста погоды
const getWeatherText = (weather: string): string => {
  switch (weather) {
    case 'excellent': return '  Отлично';
    case 'good': return ' Хорошо';
    case 'windy': return ' Ветрено';
    case 'rainy': return '  Дождь';
    default: return ' Хорошо';
  }
};

// TourDatePicker — используй именованный импорт: { TourDatePicker }



