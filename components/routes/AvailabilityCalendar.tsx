'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface SlotDay {
  date: string; // YYYY-MM-DD
  free_slots: number;
}

interface OfferInfo {
  tourId: number;
  tourName: string;
  nextDeparture: string | null;
  nextSlots: number | null;
}

interface AvailabilityCalendarProps {
  offers: OfferInfo[];
  /** Вызывается при клике на доступную дату. Передаёт YYYY-MM-DD и tourId первого подходящего тура. */
  onDateSelect?: (date: string, tourId: number) => void;
}

export default function AvailabilityCalendar({ offers, onDateSelect }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [slots, setSlots]       = useState<Map<string, number>>(new Map());
  // tourId на каждую дату (для callback)
  const [slotTours, setSlotTours] = useState<Map<string, number>>(new Map());
  const [loading, setLoading]   = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    setSelectedDate(null);
    if (offers.length === 0) { setLoading(false); return; }

    const tourIds = [...new Set(offers.map(o => o.tourId))];
    setLoading(true);

    Promise.all(
      tourIds.map(id =>
        fetch(`/api/tours/${id}/slots`)
          .then(r => r.ok ? r.json() : { slots: [] })
          .then((data: { slots?: SlotDay[] }) => ({ id, days: data.slots ?? [] }))
          .catch(() => ({ id, days: [] as SlotDay[] }))
      )
    ).then(results => {
      const merged  = new Map<string, number>();
      const tourMap = new Map<string, number>();
      for (const { id, days } of results) {
        for (const d of days) {
          const prev = merged.get(d.date) ?? 0;
          merged.set(d.date, prev + d.free_slots);
          if (!tourMap.has(d.date)) tourMap.set(d.date, id);
        }
      }
      setSlots(merged);
      setSlotTours(tourMap);
      setLoading(false);
    });
  }, [offers]);

  // При смене месяца сбрасываем выбор
  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
  }
  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
  }

  function handleDayClick(dateStr: string, freeSlots: number) {
    const date = new Date(dateStr + 'T00:00:00');
    if (date < today || freeSlots <= 0) return;

    setSelectedDate(prev => prev === dateStr ? null : dateStr);

    if (onDateSelect) {
      const tourId = slotTours.get(dateStr) ?? offers[0]?.tourId;
      if (tourId !== undefined) onDateSelect(dateStr, tourId);
    }
  }

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay    = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName   = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const isInteractive = !!onDateSelect;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
          Доступные даты
        </h3>
        <div className="flex gap-1 items-center">
          <button onClick={prevMonth}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            aria-label="Предыдущий месяц">
            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
          <span className="text-xs font-semibold px-2 py-1 min-w-32 text-center capitalize"
            style={{ color: 'var(--text-muted)' }}>
            {monthName}
          </span>
          <button onClick={nextMonth}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            aria-label="Следующий месяц">
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1 animate-pulse">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded" style={{ background: 'var(--bg-hover)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {['пн','вт','ср','чт','пт','сб','вс'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold uppercase py-1"
              style={{ color: 'var(--text-muted)' }}>
              {d}
            </div>
          ))}

          {/* Empty offset */}
          {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Days */}
          {days.map(day => {
            const date       = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isPast     = date < today;
            const dateStr    = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const freeSlots  = slots.get(dateStr) ?? 0;
            const hasAvail   = !isPast && freeSlots > 0;
            const isLow      = hasAvail && freeSlots <= 3;
            const isSelected = selectedDate === dateStr;

            let cellCls = 'aspect-square rounded text-xs font-semibold flex items-center justify-center transition-all relative';

            if (isSelected && hasAvail) {
              cellCls += ' ring-2 ring-[var(--accent)] scale-110';
            }

            if (isPast) {
              cellCls += ' opacity-25';
            } else if (hasAvail) {
              if (isInteractive) {
                cellCls += ' cursor-pointer';
              }
              if (isLow) {
                cellCls += isSelected
                  ? ' bg-[var(--warning)] text-white'
                  : ' bg-[var(--warning)]/15 text-[var(--warning)] hover:bg-[var(--warning)]/35';
              } else {
                cellCls += isSelected
                  ? ' bg-[var(--success)] text-white'
                  : ' bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/35';
              }
            } else {
              cellCls += ' opacity-40';
            }

            return (
              <div
                key={day}
                title={hasAvail ? `${freeSlots} мест${isInteractive ? ' — нажмите для бронирования' : ''}` : undefined}
                className={cellCls}
                style={{ color: hasAvail && !isSelected ? undefined : undefined }}
                onClick={() => handleDayClick(dateStr, freeSlots)}
                role={isInteractive && hasAvail ? 'button' : undefined}
                tabIndex={isInteractive && hasAvail ? 0 : undefined}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleDayClick(dateStr, freeSlots); }}
                aria-label={hasAvail ? `${day} — ${freeSlots} мест` : String(day)}
                aria-pressed={isInteractive ? isSelected : undefined}
              >
                {day}
                {/* Dot indicator for very low slots */}
                {isLow && !isSelected && (
                  <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full"
                    style={{ background: 'var(--warning)' }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Call to action when date selected */}
      {isInteractive && selectedDate && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--accent)', background: 'rgba(212,74,12,0.06)' }}>
          <CalendarDays className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="text-xs" style={{ color: 'var(--accent)' }}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', {
              day: 'numeric', month: 'long',
            })} выбрано — продолжите ниже
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && slots.size === 0 && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
          Нет доступных дат в ближайшее время
        </p>
      )}

      {/* Legend */}
      {offers.length > 0 && !loading && (
        <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block"
                style={{ background: 'rgba(63,185,80,0.40)' }} />
              есть места
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block"
                style={{ background: 'rgba(210,153,34,0.40)' }} />
              мало мест
            </span>
            {isInteractive && (
              <span className="flex items-center gap-1">
                нажмите для бронирования
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
