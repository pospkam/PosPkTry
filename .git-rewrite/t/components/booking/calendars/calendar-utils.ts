// ===========================================
// УТИЛИТЫ ДЛЯ КАЛЕНДАРЕЙ БРОНИРОВАНИЯ
// KamHub - Calendar Utilities
// ===========================================

import { differenceInDays, addDays, format, parse, isAfter, isBefore, isSameDay, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Форматирование даты для отображения
 */
export const formatDisplayDate = (date: Date | null): string => {
  if (!date) return '';
  return format(date, 'd MMMM yyyy', { locale: ru });
};

/**
 * Форматирование даты для API (YYYY-MM-DD)
 */
export const formatAPIDate = (date: Date | null): string => {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
};

/**
 * Парсинг даты из строки API
 */
export const parseAPIDate = (dateString: string): Date => {
  return parse(dateString, 'yyyy-MM-dd', new Date());
};

/**
 * Расчёт количества ночей между датами
 */
export const calculateNights = (checkIn: Date | null, checkOut: Date | null): number => {
  if (!checkIn || !checkOut) return 0;
  return differenceInDays(checkOut, checkIn);
};

/**
 * Проверка, что дата в прошлом
 */
export const isPastDate = (date: Date): boolean => {
  return isBefore(startOfDay(date), startOfDay(new Date()));
};

/**
 * Проверка, что дата сегодня
 */
export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

/**
 * Проверка, что дата в будущем
 */
export const isFutureDate = (date: Date): boolean => {
  return isAfter(startOfDay(date), startOfDay(new Date()));
};

/**
 * Получение диапазона дат между двумя датами
 */
export const getDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  let currentDate = startOfDay(start);
  const endDate = startOfDay(end);

  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return dates;
};

/**
 * Проверка, что дата входит в массив дат
 */
export const isDateInArray = (date: Date, dates: Date[]): boolean => {
  return dates.some(d => isSameDay(d, date));
};

/**
 * Валидация диапазона дат для отелей
 */
export interface DateRangeValidation {
  valid: boolean;
  error?: string;
}

export const validateStayDateRange = (
  checkIn: Date | null,
  checkOut: Date | null,
  minNights: number = 1,
  blockedDates: Date[] = []
): DateRangeValidation => {
  if (!checkIn || !checkOut) {
    return { valid: false, error: 'Выберите даты заезда и выезда' };
  }

  if (isPastDate(checkIn)) {
    return { valid: false, error: 'Дата заезда не может быть в прошлом' };
  }

  if (isBefore(checkOut, checkIn) || isSameDay(checkOut, checkIn)) {
    return { valid: false, error: 'Дата выезда должна быть после даты заезда' };
  }

  const nights = calculateNights(checkIn, checkOut);
  if (nights < minNights) {
    return { 
      valid: false, 
      error: `Минимальное количество ночей: ${minNights}` 
    };
  }

  // Проверка, что нет заблокированных дат в диапазоне
  const dateRange = getDateRange(checkIn, checkOut);
  const hasBlockedDate = dateRange.some(date => isDateInArray(date, blockedDates));
  
  if (hasBlockedDate) {
    return { 
      valid: false, 
      error: 'В выбранном диапазоне есть недоступные даты' 
    };
  }

  return { valid: true };
};

/**
 * Расчёт цены за период
 */
export interface PriceBreakdown {
  nights: number;
  pricePerNight: number;
  subtotal: number;
  serviceFee: number;
  taxes: number;
  total: number;
}

export const calculateStayPrice = (
  checkIn: Date | null,
  checkOut: Date | null,
  pricePerNight: number,
  serviceFeePercent: number = 0.05, // 5%
  taxPercent: number = 0.02 // 2%
): PriceBreakdown | null => {
  if (!checkIn || !checkOut) return null;

  const nights = calculateNights(checkIn, checkOut);
  const subtotal = nights * pricePerNight;
  const serviceFee = Math.round(subtotal * serviceFeePercent);
  const taxes = Math.round(subtotal * taxPercent);
  const total = subtotal + serviceFee + taxes;

  return {
    nights,
    pricePerNight,
    subtotal,
    serviceFee,
    taxes,
    total
  };
};

/**
 * Получение доступных слотов времени для туров
 */
export interface TimeSlot {
  id: string;
  time: string;
  displayTime: string;
  available: number;
  total: number;
  price: number;
}

export const formatTimeSlot = (time: string): string => {
  // Преобразует "09:00" в "09:00"
  return time;
};

/**
 * Получение индикатора доступности
 */
export type AvailabilityLevel = 'sold-out' | 'few-seats' | 'available' | 'many-seats';

export const getAvailabilityLevel = (available: number, total: number): AvailabilityLevel => {
  if (available === 0) return 'sold-out';
  
  const percentage = (available / total) * 100;
  
  if (percentage < 20) return 'few-seats';
  if (percentage >= 50) return 'many-seats';
  return 'available';
};

/**
 * Получение цвета индикатора доступности
 */
export const getAvailabilityColor = (level: AvailabilityLevel): string => {
  switch (level) {
    case 'sold-out': return '#EF4444'; // red
    case 'few-seats': return '#F59E0B'; // orange
    case 'available': return '#FFFFFF'; // white
    case 'many-seats': return '#10B981'; // green
  }
};

/**
 * Получение текста индикатора доступности
 */
export const getAvailabilityText = (level: AvailabilityLevel): string => {
  switch (level) {
    case 'sold-out': return 'Места закончились';
    case 'few-seats': return 'Мало мест';
    case 'available': return 'Доступно';
    case 'many-seats': return 'Много мест';
  }
};

/**
 * Форматирование номера телефона
 */
export const formatPhone = (phone: string): string => {
  // Удаляем все нецифровые символы
  const cleaned = phone.replace(/\D/g, '');
  
  // Форматируем как +7 (XXX) XXX-XX-XX
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
  }
  
  return phone;
};

/**
 * Валидация email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Валидация телефона (российский формат)
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 11 && cleaned.startsWith('7');
};

/**
 * Генерация кода подтверждения
 */
export const generateConfirmationCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Форматирование длительности
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} мин`;
  }
  
  if (mins === 0) {
    return `${hours} ч`;
  }
  
  return `${hours} ч ${mins} мин`;
};

/**
 * Форматирование цены
 */
export const formatPrice = (price: number, currency: string = '₽'): string => {
  return `${price.toLocaleString('ru-RU')} ${currency}`;
};

/**
 * Дебаунс функция
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};



