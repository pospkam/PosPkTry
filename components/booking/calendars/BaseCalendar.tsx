'use client';

// ===========================================
// БАЗОВЫЙ КАЛЕНДАРЬ
// KamHub - Base Calendar Component
// ===========================================

import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import styles from './calendar.module.css';
import clsx from 'clsx';

// Регистрация русской локали
registerLocale('ru', ru);

export interface BaseCalendarProps {
  // Основные пропсы
  selected?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  onChange: (date: Date | [Date | null, Date | null] | null) => void;
  
  // Конфигурация
  selectsRange?: boolean;
  inline?: boolean;
  monthsShown?: number;
  
  // Ограничения
  minDate?: Date;
  maxDate?: Date;
  excludeDates?: Date[];
  includeDates?: Date[];
  filterDate?: (date: Date) => boolean;
  
  // Кастомизация
  dayClassName?: (date: Date) => string | null;
  renderDayContents?: (dayOfMonth: number, date: Date) => React.ReactNode;
  
  // Состояния
  disabled?: boolean;
  loading?: boolean;
  
  // UI
  placeholderText?: string;
  dateFormat?: string;
  showTimeSelect?: boolean;
  timeIntervals?: number;
  timeCaption?: string;
  
  // Дополнительные опции
  className?: string;
  calendarClassName?: string;
}

export const BaseCalendar: React.FC<BaseCalendarProps> = ({
  selected,
  startDate,
  endDate,
  onChange,
  selectsRange = false,
  inline = true,
  monthsShown = 2,
  minDate,
  maxDate,
  excludeDates = [],
  includeDates,
  filterDate,
  dayClassName,
  renderDayContents,
  disabled = false,
  loading = false,
  placeholderText = 'Выберите дату',
  dateFormat = 'd MMMM yyyy',
  showTimeSelect = false,
  timeIntervals = 60,
  timeCaption = 'Время',
  className,
  calendarClassName,
}) => {
  return (
    <div
      className={clsx(
        styles.calendarContainer,
        {
          [styles.loading]: loading,
        },
        className
      )}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DatePicker
        {...({
          selected,
          startDate,
          endDate,
          onChange: onChange as (date: Date | null) => void,
          selectsRange: selectsRange ? true : undefined,
          inline: inline ? true : undefined,
          monthsShown,
          minDate,
          maxDate,
          excludeDates,
          includeDates,
          filterDate,
          dayClassName: dayClassName ? (d: Date) => dayClassName(d) ?? '' : undefined,
          renderDayContents,
          disabled,
          placeholderText,
          dateFormat,
          showTimeSelect,
          timeIntervals,
          timeCaption,
          locale: 'ru',
          calendarClassName,
          showPopperArrow: false,
        } as any)}
      />
    </div>
  );
};

// BaseCalendar — используй именованный импорт: { BaseCalendar }



