'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface AvailabilityCalendarProps {
  offers: Array<{
    tourId: number;
    tourName: string;
    nextDeparture: string | null;
    nextSlots: number | null;
  }>;
}

export default function AvailabilityCalendar({ offers }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prev = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const next = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const monthName = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          Доступные даты
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prev}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[var(--text-muted)] px-2 py-1 min-w-32 text-center">
            {monthName}
          </span>
          <button
            onClick={next}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-[var(--text-muted)] uppercase py-1">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map(day => {
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const isPast = date < today;

          return (
            <div
              key={day}
              className={`aspect-square p-1 rounded text-xs font-semibold flex items-center justify-center relative ${
                isPast
                  ? 'text-[var(--text-muted)]/40'
                  : 'bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 transition-colors cursor-pointer'
              }`}
            >
              {day}
              {!isPast && (
                <CheckCircle className="absolute top-0 right-0 w-2.5 h-2.5" />
              )}
            </div>
          );
        })}
      </div>

      {offers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Туры</p>
          <div className="space-y-1.5">
            {offers.slice(0, 5).map(offer => (
              <div key={offer.tourId} className="flex items-center justify-between text-xs p-2 bg-[var(--bg-hover)] rounded">
                <p className="font-semibold text-[var(--text-primary)] line-clamp-1">
                  {offer.tourName}
                </p>
                <span className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 bg-[var(--success)]/20 text-[var(--success)]">
                  доступно
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
