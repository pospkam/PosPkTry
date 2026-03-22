'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  ArrowLeft, Calendar, MapPin, Loader, AlertTriangle,
  Footprints, Truck, Anchor, Plane, ChevronDown, ChevronUp,
  Phone, Check, Pencil, PlaneLanding, PlaneTakeoff,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayPlan {
  day: number;
  zone: string;
  title: string;
  activityType: string;
  priceFrom: number;
  priceTo: number;
  coords: [number, number];
  defaultTransport: string;
}

interface TripDetail {
  id: string;
  title: string;
  arrival_date: string | null;
  departure_date: string | null;
  flight_arrival: string | null;
  flight_departure: string | null;
  places: string[];
  activities: string[];
  days: DayPlan[];
  transport_by_day: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, string> = {
  avachinsky: 'var(--accent)',
  eastern:    'var(--ocean)',
  northern:   'var(--success)',
  western:    'var(--purple)',
};

const ZONE_LABELS: Record<string, string> = {
  avachinsky: 'Авачинская — вулканы',
  eastern:    'Карагинская — остров',
  northern:   'Тигильская — гейзеры',
  western:    'Мильковская — рыбалка',
};

const TRANSPORT_ICONS: Record<string, React.ElementType> = {
  walking: Footprints, jeep: Truck, boat: Anchor, helicopter: Plane,
};

const TRANSPORT_LABELS: Record<string, string> = {
  walking: 'Пешком', jeep: 'Джип', boat: 'Катер', helicopter: 'Вертолёт',
};

const TRANSPORT_PRICE: Record<string, number> = {
  walking: 0, jeep: 3000, boat: 8000, helicopter: 25000,
};

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

function fmtDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TripDetailClient({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Contact form
  const [showContact, setShowContact] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');
  const [showDays, setShowDays] = useState(true);

  useEffect(() => {
    fetch(`/api/trips/${tripId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setTrip(d.data);
        else setError(d.error ?? 'Маршрут не найден');
      })
      .catch(() => setError('Нет соединения'))
      .finally(() => setLoading(false));
  }, [tripId]);

  async function submitLead() {
    if (!name.trim() || !phone.trim()) {
      setFormError('Введите имя и телефон');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          comment: trip ? `Маршрут: ${trip.title} (${trip.days.length} дн.)` : undefined,
          sourceData: {
            source: 'saved_trip',
            trip_id: tripId,
            trip_title: trip?.title,
            arrival: trip?.arrival_date,
            departure: trip?.departure_date,
            flight_arrival: trip?.flight_arrival ?? undefined,
            flight_departure: trip?.flight_departure ?? undefined,
            places: trip?.places,
            activities: trip?.activities,
          },
        }),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      else setFormError(data.error ?? 'Ошибка');
    } catch {
      setFormError('Нет соединения');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-[var(--text-muted)]">
      <Loader className="w-5 h-5 animate-spin" />
      <span className="text-sm">Загружаем маршрут...</span>
    </div>
  );

  if (error || !trip) return (
    <div className="ds-page max-w-2xl mx-auto">
      <div className="flex items-center gap-2 p-4 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0" />
        <p className="text-sm text-[var(--danger)]">{error || 'Маршрут не найден'}</p>
      </div>
      <Link href="/hub/tourist/trips" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--ocean)] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Все маршруты
      </Link>
    </div>
  );

  const totalFrom = trip.days.reduce((s, d) => {
    const transport = trip.transport_by_day[String(d.day)] ?? d.defaultTransport;
    return s + d.priceFrom + (TRANSPORT_PRICE[transport] ?? 0);
  }, 0);
  const totalTo = trip.days.reduce((s, d) => {
    const transport = trip.transport_by_day[String(d.day)] ?? d.defaultTransport;
    return s + d.priceTo + (TRANSPORT_PRICE[transport] ?? 0);
  }, 0);

  return (
    <Protected roles={['tourist', 'admin']}>
      <div className="ds-page max-w-2xl mx-auto space-y-6">

        {/* Back */}
        <Link href="/hub/tourist/trips"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Все маршруты
        </Link>

        {/* Header */}
        <div className="ds-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-playfair text-2xl font-bold text-[var(--text-primary)] leading-tight">
              {trip.title}
            </h1>
            <Link href="/planner"
              className="ds-btn ds-btn-secondary flex items-center gap-2 px-3 py-2 text-xs font-medium shrink-0">
              <Pencil className="w-3.5 h-3.5" />
              Изменить
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
            {trip.arrival_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {fmtDate(trip.arrival_date)}
                {trip.departure_date && <> — {fmtDate(trip.departure_date)}</>}
              </span>
            )}
            {trip.days.length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {trip.days.length} {trip.days.length === 1 ? 'день' : trip.days.length < 5 ? 'дня' : 'дней'}
              </span>
            )}
            {trip.flight_arrival && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ocean)]/10 text-[var(--ocean)] text-xs font-semibold">
                <Plane className="w-3.5 h-3.5" />
                {trip.flight_arrival}
              </span>
            )}
            {trip.flight_departure && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ocean)]/10 text-[var(--ocean)] text-xs font-semibold">
                <Plane className="w-3.5 h-3.5 rotate-180" />
                {trip.flight_departure}
              </span>
            )}
          </div>

          {trip.days.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <span className="text-sm text-[var(--text-secondary)]">Ориентировочная стоимость</span>
              <span className="text-base font-semibold text-[var(--accent)]">
                от {fmt(totalFrom)} — до {fmt(totalTo)} ₽
              </span>
            </div>
          )}
        </div>

        {/* Day plan */}
        {trip.days.length > 0 && (
          <div className="ds-card overflow-hidden">
            <button
              onClick={() => setShowDays(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--bg-hover)] transition-colors">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                План по дням ({trip.days.length})
              </span>
              {showDays ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </button>

            {showDays && (
              <div className="divide-y divide-[var(--border)]">
                {trip.days.map((d, idx) => {
                  const transport = trip.transport_by_day[String(d.day)] ?? d.defaultTransport;
                  const TransIcon = TRANSPORT_ICONS[transport] ?? Footprints;
                  const priceAdd = TRANSPORT_PRICE[transport] ?? 0;
                  const flightBadge = idx === 0 && trip.flight_arrival ? trip.flight_arrival
                    : idx === trip.days.length - 1 && trip.flight_departure ? trip.flight_departure
                    : null;
                  return (
                    <div key={d.day} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: ZONE_COLORS[d.zone] ?? 'var(--accent)' }}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{d.title}</p>
                          {flightBadge && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--ocean)]/15 text-[var(--ocean)] text-[9px] font-bold shrink-0 whitespace-nowrap">
                              <Plane className="w-2.5 h-2.5" />
                              {flightBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {ZONE_LABELS[d.zone] ?? d.zone}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                          <TransIcon className="w-3 h-3" />
                          {TRANSPORT_LABELS[transport] ?? transport}
                        </span>
                        <span className="text-xs font-medium text-[var(--accent)]">
                          от {fmt(d.priceFrom + priceAdd)} ₽
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {done ? (
          <div className="ds-card p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[var(--success)]/15 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5 text-[var(--success)]" />
            </div>
            <p className="font-semibold text-[var(--text-primary)]">Заявка отправлена</p>
            <p className="text-sm text-[var(--text-secondary)]">Свяжемся с вами в ближайшее время.</p>
          </div>
        ) : !showContact ? (
          <button onClick={() => setShowContact(true)}
            className="w-full ds-btn ds-btn-primary py-3 font-semibold text-base">
            Запросить подробное предложение
          </button>
        ) : (
          <div className="ds-card p-5 space-y-3">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Контакты</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ваше имя" className="ds-input w-full" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+7 900 000-00-00" className="ds-input w-full" />
            {formError && (
              <div className="flex items-center gap-2 p-2 bg-[var(--danger)]/10 rounded">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                <p className="text-xs text-[var(--danger)]">{formError}</p>
              </div>
            )}
            <button onClick={submitLead} disabled={submitting}
              className="w-full ds-btn ds-btn-primary py-2.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <><Loader className="w-4 h-4 animate-spin" />Отправляем...</> : <>
                <Phone className="w-4 h-4" />Отправить заявку
              </>}
            </button>
          </div>
        )}
      </div>
    </Protected>
  );
}
