'use client';

// ===========================================
// КАЛЕНДАРЬ ДЛЯ ТРАНСФЕРОВ (TransferDateTimePicker)
// KamHub - Transfer Date Time Picker
// ===========================================

import React, { useState } from 'react';
import { BaseCalendar } from './BaseCalendar';
import { AvailabilityIndicator } from '../ui/AvailabilityIndicator';
import {
  formatDisplayDate,
  formatAPIDate,
  formatPrice,
  formatDuration
} from './calendar-utils';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export interface TransferSchedule {
  id: string;
  vehicleType: 'bus' | 'minibus' | 'helicopter' | 'car';
  vehicleModel: string;
  departureTime: string;
  arrivalTime: string;
  duration: number; // в минутах
  availableSeats: number;
  totalSeats: number;
  price: number;
  driver: {
    name: string;
    rating: number;
  };
  features: string[]; // 'wifi', 'ac', 'comfort', 'vip', 'panoramic'
  weatherDependent?: boolean;
}

export interface TransferDateTimePickerProps {
  // ID маршрута
  routeId: string;
  
  // Информация о маршруте
  fromLocation: string;
  toLocation: string;
  distance: number; // в км
  
  // Callback при выборе
  onScheduleSelect: (scheduleId: string, date: Date, schedule: TransferSchedule) => void;
  
  // Начальные значения
  initialDate?: Date | null;
  
  // UI
  className?: string;
}

interface SchedulesResponse {
  schedules: TransferSchedule[];
}

export const TransferDateTimePicker: React.FC<TransferDateTimePickerProps> = ({
  routeId,
  fromLocation,
  toLocation,
  distance,
  onScheduleSelect,
  initialDate = null,
  className,
}) => {
  // Состояния
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [schedules, setSchedules] = useState<TransferSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка расписания при выборе даты
  const handleDateSelect = async (date: Date | null) => {
    if (!date) {
      setSelectedDate(null);
      setSchedules([]);
      setSelectedScheduleId(null);
      return;
    }

    setSelectedDate(date);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/transfers/${routeId}/schedules?date=${formatAPIDate(date)}`
      );

      if (!response.ok) {
        throw new Error('Не удалось загрузить расписание');
      }

      const data: SchedulesResponse = await response.json();
      setSchedules(data.schedules || []);

      if (data.schedules.length === 0) {
        toast.error('На эту дату нет доступных рейсов');
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
      toast.error('Не удалось загрузить расписание');
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  // Выбор рейса
  const handleScheduleSelect = (schedule: TransferSchedule) => {
    if (schedule.availableSeats === 0) {
      toast.error('Места закончились');
      return;
    }

    setSelectedScheduleId(schedule.id);
    if (selectedDate) {
      onScheduleSelect(schedule.id, selectedDate, schedule);
    }
  };

  return (
    <div className={clsx('grid grid-cols-1 lg:grid-cols-2 gap-6', className)}>
      {/* Левая колонка - Календарь */}
      <div>
        {/* Информация о маршруте */}
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="text-white font-medium text-lg mb-2">
            {fromLocation} → {toLocation}
          </div>
          <div className="text-white/70 text-sm">
            Расстояние: {distance} км
          </div>
        </div>

        {/* Выбранная дата */}
        {selectedDate && (
          <div className="mb-6">
            <label className="block text-sm text-white/70 mb-2">
              Дата трансфера
            </label>
            <div className="px-4 py-3 bg-premium-gold/10 border border-premium-gold/30 rounded-lg text-white font-medium">
              {formatDisplayDate(selectedDate)}
            </div>
          </div>
        )}

        {/* Календарь */}
        <BaseCalendar
          selected={selectedDate}
          onChange={handleDateSelect}
          minDate={new Date()}
          monthsShown={1}
        />
      </div>

      {/* Правая колонка - Расписание */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">
          Доступные рейсы
        </h3>

        {!selectedDate ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <div className="text-white/70">
              Выберите дату чтобы увидеть расписание
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-white/20 border-t-premium-gold rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white/70">Загружаем расписание...</div>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">😔</div>
            <div className="text-white/70">
              Нет доступных рейсов на эту дату
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {schedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                isSelected={selectedScheduleId === schedule.id}
                onSelect={handleScheduleSelect}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент карточки рейса
interface ScheduleCardProps {
  schedule: TransferSchedule;
  isSelected: boolean;
  onSelect: (schedule: TransferSchedule) => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  isSelected,
  onSelect,
}) => {
  const isSoldOut = schedule.availableSeats === 0;

  return (
    <button
      onClick={() => onSelect(schedule)}
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
      {/* Заголовок */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">
              {getVehicleIcon(schedule.vehicleType)}
            </span>
            <span className={clsx(
              'font-bold text-sm uppercase',
              isSelected ? 'text-premium-black' : 'text-white/70'
            )}>
              {getVehicleLabel(schedule.vehicleType)}
            </span>
          </div>
          <div className={clsx(
            'text-sm',
            isSelected ? 'text-premium-black/70' : 'text-white/50'
          )}>
            {schedule.vehicleModel}
          </div>
        </div>

        {!isSoldOut ? (
          <AvailabilityIndicator
            available={schedule.availableSeats}
            total={schedule.totalSeats}
            size="md"
            showCount
          />
        ) : (
          <span className="text-red-400 text-sm font-bold">
            SOLD OUT
          </span>
        )}
      </div>

      {/* Время */}
      <div className="mb-3">
        <div className={clsx(
          'text-2xl font-bold mb-1',
          isSelected ? 'text-premium-black' : 'text-white'
        )}>
          {schedule.departureTime} → {schedule.arrivalTime}
        </div>
        <div className={clsx(
          'text-sm',
          isSelected ? 'text-premium-black/70' : 'text-white/70'
        )}>
          В пути: {formatDuration(schedule.duration)}
        </div>
      </div>

      {/* Водитель */}
      <div className="mb-3 flex items-center gap-2">
        <span className={clsx(
          'text-sm',
          isSelected ? 'text-premium-black/70' : 'text-white/70'
        )}>
          Водитель: {schedule.driver.name}
        </span>
        <span className={clsx(
          'text-sm font-medium',
          isSelected ? 'text-premium-black' : 'text-premium-gold'
        )}>
          ⭐ {schedule.driver.rating}
        </span>
      </div>

      {/* Особенности */}
      {schedule.features.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {schedule.features.map((feature) => (
            <span
              key={feature}
              className={clsx(
                'px-2 py-1 rounded text-xs font-medium',
                isSelected
                  ? 'bg-premium-black/10 text-premium-black'
                  : 'bg-white/10 text-white/70'
              )}
            >
              {getFeatureLabel(feature)}
            </span>
          ))}
        </div>
      )}

      {/* Предупреждение о погоде */}
      {schedule.weatherDependent && (
        <div className="mb-3 text-xs text-yellow-400">
          ⚠️ Зависит от погоды
        </div>
      )}

      {/* Цена */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <span className={clsx(
          'text-sm',
          isSelected ? 'text-premium-black/70' : 'text-white/70'
        )}>
          Цена на человека:
        </span>
        <span className={clsx(
          'text-xl font-bold',
          isSelected ? 'text-premium-black' : 'text-premium-gold'
        )}>
          {formatPrice(schedule.price)}
        </span>
      </div>

      {isSelected && (
        <div className="mt-3 text-center text-sm font-medium text-premium-black">
          ✓ Рейс выбран
        </div>
      )}
    </button>
  );
};

// Утилиты
const getVehicleIcon = (type: string): string => {
  switch (type) {
    case 'bus': return '🚌';
    case 'minibus': return '🚐';
    case 'helicopter': return '🚁';
    case 'car': return '🚗';
    default: return '🚌';
  }
};

const getVehicleLabel = (type: string): string => {
  switch (type) {
    case 'bus': return 'Автобус';
    case 'minibus': return 'Микроавтобус';
    case 'helicopter': return 'Вертолёт';
    case 'car': return 'Легковой автомобиль';
    default: return 'Транспорт';
  }
};

const getFeatureLabel = (feature: string): string => {
  switch (feature) {
    case 'wifi': return '📶 WiFi';
    case 'ac': return '❄️ Кондиционер';
    case 'comfort': return '✨ Комфорт';
    case 'vip': return '👑 VIP';
    case 'panoramic': return '🌄 Панорамный вид';
    default: return feature;
  }
};

export default TransferDateTimePicker;



