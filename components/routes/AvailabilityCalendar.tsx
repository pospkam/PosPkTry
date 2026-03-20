'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Calendar } from 'lucide-react';

interface DateSlot {
  date: string;
  available: number;
  tourName: string;
  tourId: number;
}

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

  const slots = useMemo(() => {
    const result: Record<string, DateSlot[]> = {};
    offers.forEach(offer => {
      if (offer.nextDeparture && offer.nextSlots != null && offer.nextSlots > 0) {
        const dateStr = offer.nextDeparture.split('T')[0];
        if (!result[dateStr]) result[dateStr] = [];
        result[dateStr].push({
          date: dateStr,
          available: offer.nextSlots,
          tourName: offer.tourName,
          tourId: offer.tourId,
        });
      }
    });
    return result;
  }, [offers]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prev = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const next = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const monthName = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const hasSlots = Object.keys(slots).length > 0;

  if (!hasSlots) {
    return (
      <div className="ds-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Расписание</p>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Даты туров уточняются. Оставьте заявку — мы свяжемся с вами, когда откроется бронирование.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          Доступные даты вылетов
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
          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const daySlots = slots[dateStr] || [];
          const totalSlots = daySlots.reduce((sum, s) => sum + s.available, 0);
          const isAvailable = daySlots.length > 0;
          const isLowSlots = totalSlots > 0 && totalSlots <= 2;

          return (
            <button
              key={day}
              title={isAvailable ? daySlots.map(s => `${s.tourName} (${s.available}м)`).join(', ') : ''}
              className={`aspect-square p-1 rounded text-xs font-semibold transition-all flex items-center justify-center relative ${
                isAvailable
                  ? isLowSlots
                    ? 'bg-[var(--warning)]/20 text-[var(--warning)] hover:bg-[var(--warning)]/30'
                    : 'bg-[var(--success)]/20 text-[var(--success)] hover:bg-[var(--success)]/30'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {day}
              {isAvailable && (
                <CheckCircle className="absolute top-0 right-0 w-2.5 h-2.5" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Ближайшие вылеты</p>
        <div className="space-y-1.5">
          {offers
            .filter(o => o.nextDeparture && o.nextSlots != null && o.nextSlots > 0)
            .sort((a, b) => (a.nextDeparture || '').localeCompare(b.nextDeparture || ''))
            .slice(0, 5)
            .map(offer => {
              const date = offer.nextDeparture
                ? new Date(offer.nextDeparture).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                  })
                : '';
              const isLow = (offer.nextSlots ?? 0) <= 2;
              return (
                <div key={offer.tourId} className="flex items-center justify-between text-xs p-2 bg-[var(--bg-hover)] rounded">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] line-clamp-1">
                      {offer.tourName}
                    </p>
                    <p className="text-[var(--text-muted)]">{date}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                    isLow
                      ? 'bg-[var(--warning)]/20 text-[var(--warning)]'
                      : 'bg-[var(--success)]/20 text-[var(--success)]'
                  }`}>
                    {offer.nextSlots}м
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
