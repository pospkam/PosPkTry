'use client';

// ===========================================
// КАЛЕНДАРЬ ДЛЯ ОТЕЛЕЙ (StayDatePicker)
// KamHub - Accommodation Date Picker
// ===========================================

import React, { useState, useEffect, useCallback } from 'react';
import { BaseCalendar } from './BaseCalendar';
import {
  calculateNights,
  validateStayDateRange,
  calculateStayPrice,
  formatDisplayDate,
  formatAPIDate,
  formatPrice,
  debounce,
  type PriceBreakdown
} from './calendar-utils';
import styles from './calendar.module.css';
import toast from 'react-hot-toast';

export interface StayDatePickerProps {
  // ID объекта размещения
  accommodationId: string;
  
  // Цена за ночь
  pricePerNight: number;
  
  // Минимальное количество ночей
  minNights?: number;
  
  // Callback при изменении дат
  onDatesChange: (checkIn: Date | null, checkOut: Date | null, pricing: PriceBreakdown | null) => void;
  
  // Начальные значения
  initialCheckIn?: Date | null;
  initialCheckOut?: Date | null;
  
  // Дополнительные опции
  showPriceBreakdown?: boolean;
  enableAvailabilityCheck?: boolean;
  
  // UI
  className?: string;
}

interface BlockedDatesResponse {
  blockedDates: string[]; // YYYY-MM-DD format
}

interface AvailabilityResponse {
  available: boolean;
  reason?: string;
}

export const StayDatePicker: React.FC<StayDatePickerProps> = ({
  accommodationId,
  pricePerNight,
  minNights = 1,
  onDatesChange,
  initialCheckIn = null,
  initialCheckOut = null,
  showPriceBreakdown = true,
  enableAvailabilityCheck = true,
  className,
}) => {
  // Состояния
  const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn);
  const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pricing, setPricing] = useState<PriceBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Загрузка заблокированных дат
  useEffect(() => {
    loadBlockedDates();
  }, [accommodationId]);

  const loadBlockedDates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/accommodations/${accommodationId}/blocked-dates`
      );
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить доступные даты');
      }

      const data: BlockedDatesResponse = await response.json();
      
      // Преобразуем строки в Date объекты
      const dates = data.blockedDates.map(dateStr => new Date(dateStr));
      setBlockedDates(dates);
    } catch (err) {
      console.error('Error loading blocked dates:', err);
      toast.error('Не удалось загрузить календарь');
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  // Проверка доступности (с дебаунсом)
  const checkAvailability = useCallback(
    debounce(async (checkInDate: Date, checkOutDate: Date) => {
      if (!enableAvailabilityCheck) return;

      setChecking(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/accommodations/${accommodationId}/availability?` +
          `checkIn=${formatAPIDate(checkInDate)}&` +
          `checkOut=${formatAPIDate(checkOutDate)}`
        );

        if (!response.ok) {
          throw new Error('Не удалось проверить доступность');
        }

        const data: AvailabilityResponse = await response.json();

        if (!data.available) {
          setError(data.reason || 'К сожалению, номера заняты на эти даты');
          toast.error('Выбранные даты недоступны');
          setCheckOut(null);
          setPricing(null);
          onDatesChange(checkInDate, null, null);
        }
      } catch (err) {
        console.error('Error checking availability:', err);
        // Не блокируем выбор при ошибке проверки
      } finally {
        setChecking(false);
      }
    }, 500),
    [accommodationId, enableAvailabilityCheck, onDatesChange]
  );

  // Обработка изменения дат
  const handleDateChange = (dates: [Date | null, Date | null] | null) => {
    if (!dates) {
      setCheckIn(null);
      setCheckOut(null);
      setPricing(null);
      setError(null);
      onDatesChange(null, null, null);
      return;
    }

    const [start, end] = dates;
    setCheckIn(start);
    setCheckOut(end);

    if (start && end) {
      // Валидация
      const validation = validateStayDateRange(start, end, minNights, blockedDates);

      if (!validation.valid) {
        setError(validation.error || null);
        toast.error(validation.error || 'Некорректные даты');
        return;
      }

      setError(null);

      // Расчёт цены
      const calculatedPricing = calculateStayPrice(start, end, pricePerNight);
      setPricing(calculatedPricing);

      // Проверка доступности
      if (enableAvailabilityCheck) {
        checkAvailability(start, end);
      }

      // Callback
      onDatesChange(start, end, calculatedPricing);
    } else {
      setPricing(null);
      setError(null);
      onDatesChange(start, end, null);
    }
  };

  const nights = calculateNights(checkIn, checkOut);

  return (
    <div className={className}>
      {/* Выбранные даты */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <span className="block text-sm text-white/70 mb-2">Заезд</span>
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
            {checkIn ? formatDisplayDate(checkIn) : 'Выберите дату'}
          </div>
        </div>
        <div>
          <span className="block text-sm text-white/70 mb-2">Выезд</span>
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
            {checkOut ? formatDisplayDate(checkOut) : 'Выберите дату'}
          </div>
        </div>
      </div>

      {/* Календарь */}
      <BaseCalendar
        startDate={checkIn}
        endDate={checkOut}
        onChange={handleDateChange}
        selectsRange
        monthsShown={2}
        minDate={new Date()}
        excludeDates={blockedDates}
        loading={loading || checking}
        disabled={loading}
      />

      {/* Минимум ночей */}
      {minNights > 1 && (
        <div className="mt-4 text-sm text-white/70">
          ! Минимальное количество ночей: {minNights}
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>!</span>
          <span>{error}</span>
        </div>
      )}

      {/* Разбивка цены */}
      {showPriceBreakdown && pricing && !error && (
        <div className={styles.priceInfo}>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>
              {formatPrice(pricing.pricePerNight)} × {pricing.nights} {getNightsLabel(pricing.nights)}
            </span>
            <span className={styles.priceValue}>
              {formatPrice(pricing.subtotal)}
            </span>
          </div>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>Сервисный сбор (5%)</span>
            <span className={styles.priceValue}>
              {formatPrice(pricing.serviceFee)}
            </span>
          </div>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>Налоги (2%)</span>
            <span className={styles.priceValue}>
              {formatPrice(pricing.taxes)}
            </span>
          </div>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>Итого</span>
            <span className={`${styles.priceValue} ${styles.priceTotalValue}`}>
              {formatPrice(pricing.total)}
            </span>
          </div>
        </div>
      )}

      {/* Проверка доступности */}
      {checking && (
        <div className="mt-4 text-sm text-white/70 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/20 border-t-premium-gold rounded-full animate-spin"></div>
          <span>Проверяем доступность...</span>
        </div>
      )}
    </div>
  );
};

// Утилита для правильного склонения слова "ночь"
const getNightsLabel = (count: number): string => {
  if (count === 1) return 'ночь';
  if (count >= 2 && count <= 4) return 'ночи';
  return 'ночей';
};

export default StayDatePicker;



