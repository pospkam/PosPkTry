'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalIcon, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

interface TourDeparture {
  id: string;
  title: string;
  startDate: string;
  availableSlots: number;
  bookedSlots: number;
  status: string;
}

export default function AdminCalendar() {
  const [departures, setDepartures] = useState<TourDeparture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard?period=90');
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');

      const tours = json.data?.charts?.topTours ?? [];
      setDepartures(
        tours.map((t: { id: string; title: string; bookings: number }) => ({
          id: t.id,
          title: t.title,
          startDate: new Date().toISOString(),
          availableSlots: 20,
          bookedSlots: t.bookings,
          status: 'active',
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const today = new Date();

  const monthLabel = currentMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-5 w-32 bg-[var(--bg-hover)] rounded animate-pulse" />
        <div className="h-80 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-[var(--danger)]" />
            <span className="text-sm text-[var(--text-primary)]">Ошибка</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">{error}</p>
          <button onClick={fetchData} className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-5">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalIcon className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Календарь</h1>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Обновить
        </button>
      </div>

      {/* Навигация по месяцам */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <span className="text-xs font-medium text-[var(--text-primary)] capitalize">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 border-b border-[var(--border)]">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div key={d} className="px-2 py-2 text-center text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Сетка дней */}
        <div className="grid grid-cols-7">
          {/* Пустые ячейки перед 1-м числом */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 border-b border-r border-[var(--border)] bg-[var(--bg-secondary)]" />
          ))}
          {/* Дни месяца */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();

            return (
              <div
                key={day}
                className={`h-16 border-b border-r border-[var(--border)] px-1.5 py-1 ${
                  isToday ? 'bg-[var(--accent-muted)]' : 'hover:bg-[var(--bg-hover)]'
                } transition-colors`}
              >
                <span className={`text-[10px] font-mono ${
                  isToday ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)]'
                }`}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ближайшие вылазки */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Активные туры</span>
        </div>
        {departures.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">Нет запланированных вылазок</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {departures.map(dep => (
              <div key={dep.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="text-xs text-[var(--text-primary)] flex-1 truncate">{dep.title}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {dep.bookedSlots}/{dep.availableSlots} мест
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-[var(--text-muted)]">
        Полная интеграция с расписанием вылазок — в разработке. Сейчас показаны активные туры.
      </p>

    </div>
  );
}
