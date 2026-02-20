'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import { AvailabilitySlot } from '@/types/operator';
import { useAuth } from '@/contexts/AuthContext';

export default function CalendarPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const operatorId = user?.id;

  useEffect(() => {
    fetchCalendar();
  }, [selectedMonth]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);

      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        operatorId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      const response = await fetch(`/api/operator/calendar?${params}`);
      const result = await response.json();

      if (result.success) {
        setSlots(result.data);
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Добавляем пустые дни перед началом месяца
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push(null);
    }

    // Добавляем дни месяца
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getSlotForDate = (date: Date | null) => {
    if (!date) return null;
    return slots.find(
      s => new Date(s.date).toDateString() === date.toDateString()
    );
  };

  const changeMonth = (delta: number) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setSelectedMonth(newMonth);
  };

  return (
    <Protected roles={['operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <OperatorNav />

        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-black text-white">
              Календарь доступности
            </h1>
            <p className="text-white/70 mt-1">
              Просмотр загрузки туров по дням
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка календаря..." />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Month Selector */}
              <div className="flex items-center justify-between bg-white/15 border border-white/15 rounded-xl p-4">
                <button
                  onClick={() => changeMonth(-1)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  ← Пред.
                </button>
                <h2 className="text-2xl font-bold">
                  {selectedMonth.toLocaleDateString('ru-RU', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </h2>
                <button
                  onClick={() => changeMonth(1)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  След. →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
                {/* Week days */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                    <div key={day} className="text-center font-bold text-white/70 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-2">
                  {getDaysInMonth().map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const slot = getSlotForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <div
                        key={date.toISOString()}
                        className={`
                          aspect-square rounded-lg border p-2 transition-all
                          ${isPast ? 'bg-white/15 border-white/15 opacity-50' : 'bg-white/10 border-white/20'}
                          ${isToday ? 'border-white/15 border-2' : ''}
                          ${slot?.isBlocked ? 'bg-red-500/20' : ''}
                          hover:bg-white/20 cursor-pointer
                        `}
                      >
                        <div className="text-sm font-semibold mb-1">{date.getDate()}</div>
                        {slot && !isPast && (
                          <div className="text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-white/60">
                                {slot.bookedCount}/{slot.maxCapacity}
                              </span>
                              <span className={`
                                ${slot.availableSpots === 0 ? 'text-red-400' : 
                                  slot.availableSpots < 3 ? 'text-yellow-400' : 
                                  'text-green-400'}
                              `}>
                                ●
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-400"></span>
                  <span className="text-white/70">Доступно</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                  <span className="text-white/70">Мало мест</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400"></span>
                  <span className="text-white/70">Занято</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}



