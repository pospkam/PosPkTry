'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BaseCalendar } from '@/components/booking/calendars/BaseCalendar';
import { Calendar, Users, Loader2 } from 'lucide-react';
import { isSameDay } from 'date-fns';

interface Departure {
  id: string;
  tourId: string;
  startDate: string;
  endDate: string | null;
  availableSlots: number;
  bookedSlots: number;
  spotsLeft: number;
  price: number;
  priceOverride: number | null;
  minGroupSize: number;
  status: string;
  notes: string | null;
}

interface DeparturesResponse {
  success: boolean;
  data?: {
    tourId: string;
    tourName: string;
    basePrice: number;
    departures: Departure[];
  };
  error?: string;
}

interface TourDeparturesCalendarProps {
  tourId: string;
  tourName: string;
  basePrice: number;
  currency?: string;
}

export function TourDeparturesCalendar({
  tourId,
  tourName,
  basePrice,
  currency = 'RUB',
}: TourDeparturesCalendarProps) {
  const router = useRouter();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [people, setPeople] = useState(1);

  useEffect(() => {
    const fetchDepartures = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tours/${tourId}/departures`);
        const data: DeparturesResponse = await res.json();
        if (data.success && data.data) {
          setDepartures(data.data.departures);
        } else {
          setError(data.error || 'Не удалось загрузить заезды');
        }
      } catch {
        setError('Ошибка загрузки заездов');
      } finally {
        setLoading(false);
      }
    };
    fetchDepartures();
  }, [tourId]);

  const selectedDeparture = selectedDate
    ? departures.find(d => isSameDay(new Date(d.startDate), selectedDate))
    : null;

  const includeDates = departures
    .filter(d => d.spotsLeft > 0)
    .map(d => new Date(d.startDate));

  const getDayClassName = useCallback(
    (date: Date): string | null => {
      const dep = departures.find(d => isSameDay(new Date(d.startDate), date));
      if (!dep) return null;
      if (dep.spotsLeft <= 0) return 'departure-sold-out';
      if (dep.spotsLeft <= 3) return 'departure-few';
      return 'departure-available';
    },
    [departures]
  );

  const handleDateChange = (date: Date | [Date | null, Date | null] | null) => {
    if (date instanceof Date) {
      setSelectedDate(date);
    }
  };

  const handleBook = () => {
    if (!selectedDeparture) return;
    router.push(
      `/hub/tourist/bookings/new?tourId=${tourId}&departureId=${selectedDeparture.id}&people=${people}`
    );
  };

  const price = selectedDeparture?.price ?? basePrice;
  const currencyLabel = currency === 'RUB' ? '₽' : currency;
  const maxPeople = selectedDeparture ? selectedDeparture.spotsLeft : 10;

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--accent)]" /> Доступные заезды
        </h3>
        <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Загрузка...
        </div>
      </div>
    );
  }

  if (error || departures.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--accent)]" /> Доступные заезды
        </h3>
        <p className="text-[var(--text-muted)] text-sm">
          {error || 'Нет запланированных заездов. Свяжитесь с организатором.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-base font-bold mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[var(--accent)]" /> Доступные заезды
      </h3>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
          Есть места
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
          Мало мест
        </span>
      </div>

      {/* Calendar */}
      <div className="departures-calendar">
        <BaseCalendar
          selected={selectedDate}
          onChange={handleDateChange}
          includeDates={includeDates}
          minDate={new Date()}
          monthsShown={1}
          inline
          dayClassName={getDayClassName}
          calendarClassName="departures-cal"
        />
      </div>

      {/* Selected departure info */}
      {selectedDeparture && (
        <div className="mt-4 space-y-3">
          <div className="bg-[var(--bg-card)] rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Дата</span>
              <span className="text-[var(--text-primary)] font-semibold">
                {new Date(selectedDeparture.startDate).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {selectedDeparture.endDate && (
                  <> — {new Date(selectedDeparture.endDate).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                  })}</>
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Свободно мест</span>
              <span className={`font-semibold ${selectedDeparture.spotsLeft <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                {selectedDeparture.spotsLeft} из {selectedDeparture.availableSlots}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Цена за чел.</span>
              <span className="text-[var(--accent)] font-bold">
                {price.toLocaleString('ru-RU')} {currencyLabel}
              </span>
            </div>
            {selectedDeparture.notes && (
              <p className="text-[var(--text-muted)] text-xs italic mt-1">{selectedDeparture.notes}</p>
            )}
          </div>

          {/* People count */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <Users className="w-4 h-4" /> Участников
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPeople(p => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center text-lg font-bold"
                disabled={people <= 1}
              >
                -
              </button>
              <span className="text-[var(--text-primary)] font-bold w-8 text-center">{people}</span>
              <button
                onClick={() => setPeople(p => Math.min(maxPeople, p + 1))}
                className="w-8 h-8 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center text-lg font-bold"
                disabled={people >= maxPeople}
              >
                +
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
            <span className="text-[var(--text-muted)] text-sm">Итого</span>
            <span className="text-xl font-bold text-[var(--accent)]">
              {(price * people).toLocaleString('ru-RU')} {currencyLabel}
            </span>
          </div>

          {/* Book button */}
          <button
            onClick={handleBook}
            className="w-full px-6 py-3.5 bg-[var(--accent)] hover:opacity-90 text-[var(--bg-primary)] font-bold rounded-lg transition-colors"
          >
            Забронировать
          </button>
        </div>
      )}
    </div>
  );
}
