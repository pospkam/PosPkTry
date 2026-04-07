'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SlotDay {
  date: string; // YYYY-MM-DD
  free_slots: number;
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
  const [slots, setSlots] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (offers.length === 0) { setLoading(false); return; }

    const tourIds = [...new Set(offers.map(o => o.tourId))];

    Promise.all(
      tourIds.map(id =>
        fetch(`/api/tours/${id}/slots`)
          .then(r => r.ok ? r.json() : { slots: [] })
          .then((data: { slots?: SlotDay[] }) => data.slots ?? [])
          .catch(() => [] as SlotDay[])
      )
    ).then(results => {
      const merged = new Map<string, number>();
      for (const daySlots of results.flat()) {
        merged.set(daySlots.date, (merged.get(daySlots.date) ?? 0) + daySlots.free_slots);
      }
      setSlots(merged);
      setLoading(false);
    });
  }, [offers]);

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
        <div className="flex gap-1 items-center">
          <button onClick={prev} className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[var(--text-muted)] px-2 py-1 min-w-32 text-center">
            {monthName}
          </span>
          <button onClick={next} className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1 animate-pulse">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded bg-[var(--bg-hover)]" />
          ))}
        </div>
      ) : (
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
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const freeSlots = slots.get(dateStr) ?? 0;
            const hasAvailability = !isPast && freeSlots > 0;
            const isLow = hasAvailability && freeSlots <= 3;

            return (
              <div
                key={day}
                title={hasAvailability ? `${freeSlots} мест` : undefined}
                className={`aspect-square rounded text-xs font-semibold flex items-center justify-center transition-colors ${
                  isPast
                    ? 'text-[var(--text-muted)]/30'
                    : hasAvailability
                      ? isLow
                        ? 'bg-[var(--warning)]/15 text-[var(--warning)] cursor-pointer hover:bg-[var(--warning)]/30'
                        : 'bg-[var(--success)]/15 text-[var(--success)] cursor-pointer hover:bg-[var(--success)]/30'
                      : 'text-[var(--text-muted)]/50'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      )}

      {!loading && slots.size === 0 && (
        <p className="text-xs text-center text-[var(--text-muted)] py-2">
          Нет доступных дат в ближайшее время
        </p>
      )}

      {offers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex gap-3 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[var(--success)]/40 inline-block" /> есть места
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[var(--warning)]/40 inline-block" /> мало мест
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
