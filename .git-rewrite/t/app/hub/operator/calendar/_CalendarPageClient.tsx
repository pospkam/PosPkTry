'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import { AvailabilitySlot } from '@/types/operator';
import { useAuth } from '@/contexts/AuthContext';

export default function CalendarPageClient() {
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
        ...(operatorId ? { operatorId } : {}),
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
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Календарь доступности</h1>
        <p className="text-[var(--text-muted)] mt-1">Просмотр загрузки туров по дням</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка календаря..." />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Month Selector */}
          <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
            <button
              onClick={() => changeMonth(-1)}
              className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors text-sm"
            >
              ← Пред.
            </button>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {selectedMonth.toLocaleDateString('ru-RU', {
                month: 'long',
                year: 'numeric'
              })}
            </h2>
            <button
              onClick={() => changeMonth(1)}
              className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-md transition-colors text-sm"
            >
              След. →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
            {/* Week days */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="text-center text-[10px] uppercase tracking-widest text-[var(--text-muted)] py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth().map((date, calIndex) => {
                if (!date) {
                  return <div key={`empty-cell-${calIndex}`} className="aspect-square" />;
                }

                const slot = getSlotForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      aspect-square rounded-md border p-2 transition-all
                      ${isPast ? 'bg-[var(--bg-hover)] border-[var(--border)] opacity-50' : 'bg-[var(--bg-primary)] border-[var(--border)]'}
                      ${isToday ? 'border-[var(--accent)] border-2' : ''}
                      ${slot?.isBlocked ? 'bg-[var(--danger)]/10' : ''}
                      hover:bg-[var(--bg-hover)] cursor-pointer
                    `}
                  >
                    <div className="text-sm font-semibold mb-1 text-[var(--text-primary)]">{date.getDate()}</div>
                    {slot && !isPast && (
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-muted)]">
                            {slot.bookedCount}/{slot.maxCapacity}
                          </span>
                          <span className={`
                            ${slot.availableSpots === 0 ? 'text-[var(--danger)]' :
                              slot.availableSpots < 3 ? 'text-[var(--warning)]' :
                              'text-[var(--success)]'}
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
              <span className="w-3 h-3 rounded-full bg-[var(--success)]"></span>
              <span className="text-[var(--text-muted)]">Доступно</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--warning)]"></span>
              <span className="text-[var(--text-muted)]">Мало мест</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--danger)]"></span>
              <span className="text-[var(--text-muted)]">Занято</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
