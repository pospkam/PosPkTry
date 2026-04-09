'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Users, Clock, Star,
  CheckCircle, X, SlidersHorizontal, CalendarDays,
  CloudLightning, TrendingDown, Zap,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import TourPaymentModal from '@/components/booking/TourPaymentModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayAvail {
  date: string;
  tourCount: number;
  freeSlots: number;
  priceFrom: number | null;
  activities: string[];
  operators: number;
}

interface Tour {
  tourId: number;
  title: string;
  description: string | null;
  activityType: string | null;
  activityLabel: string | null;
  locationName: string | null;
  price: number;
  durationHours: number | null;
  durationType: string | null;
  freeSlots: number;
  availableSlots: number;
  weatherStatus: string;
  operator: {
    id: string;
    name: string;
    verified: boolean;
    rating: number | null;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS   = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU  = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

const ACTIVITIES = [
  { value: '', label: 'Все типы' },
  { value: 'trekking',      label: 'Треккинг'      },
  { value: 'fishing',       label: 'Рыбалка'       },
  { value: 'bear_watching', label: 'Медведи'       },
  { value: 'helicopter',    label: 'Вертолёт'      },
  { value: 'thermal',       label: 'Термальные'    },
  { value: 'boat_trip',     label: 'Морская прогулка'},
  { value: 'snowmobile',    label: 'Снегоход'      },
  { value: 'jeep',          label: 'Джип-тур'      },
  { value: 'eco',           label: 'Эко-тур'       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RUB = (v: number) => v.toLocaleString('ru-RU') + ' ₽';

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function formatDuration(hours: number | null, type: string | null): string {
  if (!hours) return '';
  if (type === 'multi_day') return `${Math.round(hours / 24)} дней`;
  if (hours < 1)  return `${Math.round(hours * 60)} мин`;
  if (hours === Math.floor(hours)) return `${hours} ч`;
  return `${hours} ч`;
}

/** Цвет ячейки по кол-ву доступных туров */
function dayBg(tourCount: number, selected: boolean): string {
  if (selected) return 'var(--accent)';
  if (tourCount === 0) return 'transparent';
  if (tourCount === 1) return 'rgba(37,104,176,0.12)';
  if (tourCount <= 3)  return 'rgba(37,104,176,0.22)';
  if (tourCount <= 6)  return 'rgba(212,74,12,0.18)';
  return 'rgba(212,74,12,0.30)';
}

function slotsBadge(free: number, total: number) {
  const pct = free / total;
  if (pct <= 0.25) return { color: 'var(--danger)',  label: 'Мало мест' };
  if (pct <= 0.6)  return { color: 'var(--warning)', label: 'Есть места' };
  return               { color: 'var(--success)',    label: 'Много мест' };
}

// ─── Tour Card ────────────────────────────────────────────────────────────────

function TourCard({
  tour, selectedDate, onBook,
}: {
  tour: Tour;
  selectedDate: string;
  onBook: (tour: Tour) => void;
}) {
  const badge   = slotsBadge(tour.freeSlots, tour.availableSlots);
  const weather = tour.weatherStatus === 'alert';

  return (
    <div className="ds-card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Шапка */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {tour.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {tour.activityLabel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                {tour.activityLabel}
              </span>
            )}
            {tour.locationName && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {tour.locationName}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-base" style={{ color: 'var(--accent)' }}>
            {RUB(tour.price)}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>за чел.</div>
        </div>
      </div>

      {/* Мета */}
      <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-secondary)' }}>
        {tour.durationHours && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(tour.durationHours, tour.durationType)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span style={{ color: badge.color }}>{tour.freeSlots} мест</span>
        </span>
        {weather && (
          <span className="flex items-center gap-1" style={{ color: 'var(--warning)' }}>
            <CloudLightning className="w-3 h-3" />
            Погодный риск
          </span>
        )}
      </div>

      {/* Оператор */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {tour.operator.name}
          </span>
          {tour.operator.verified && (
            <CheckCircle className="w-3 h-3" style={{ color: 'var(--success)' }} />
          )}
          {tour.operator.rating !== null && (
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-[var(--warning)] text-[var(--warning)]" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {tour.operator.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: `color-mix(in srgb, ${badge.color} 12%, transparent)`, color: badge.color }}>
          {badge.label}
        </span>
      </div>

      {/* CTA */}
      <button
        onClick={() => onBook(tour)}
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Забронировать на {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', {
          day: 'numeric', month: 'long',
        })}
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CalendarClient() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activity, setActivity] = useState('');

  const [monthData, setMonthData] = useState<DayAvail[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTours, setDayTours]   = useState<Tour[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);

  const [bookingTour, setBookingTour] = useState<Tour | null>(null);

  // ── Загрузка месяца ─────────────────────────────────────────────────────────
  const loadMonth = useCallback(async () => {
    setLoadingMonth(true);
    setSelectedDate(null);
    setDayTours([]);
    try {
      const m   = `${year}-${String(month).padStart(2,'0')}`;
      const q   = activity ? `&activity=${activity}` : '';
      const res = await fetch(`/api/availability?month=${m}${q}`);
      const json: { success: boolean; days: DayAvail[] } = await res.json();
      if (json.success) setMonthData(json.days);
    } finally {
      setLoadingMonth(false);
    }
  }, [year, month, activity]);

  useEffect(() => { void loadMonth(); }, [loadMonth]);

  // ── Загрузка дня ────────────────────────────────────────────────────────────
  async function selectDay(iso: string) {
    if (selectedDate === iso) { setSelectedDate(null); setDayTours([]); return; }
    setSelectedDate(iso);
    setDayTours([]);
    setLoadingDay(true);
    try {
      const q   = activity ? `&activity=${activity}` : '';
      const res = await fetch(`/api/availability/day?date=${iso}${q}`);
      const json: { success: boolean; tours: Tour[] } = await res.json();
      if (json.success) setDayTours(json.tours);
    } finally {
      setLoadingDay(false);
    }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // Сетка
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO = toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const dayMap   = new Map(monthData.map(d => [d.date, d]));

  // Статистика месяца
  const totalTours  = monthData.reduce((s, d) => s + d.tourCount, 0);
  const daysWithAvail = monthData.filter(d => d.tourCount > 0).length;
  const minPrice    = monthData.reduce<number | null>((min, d) =>
    d.priceFrom !== null ? (min === null ? d.priceFrom : Math.min(min, d.priceFrom)) : min, null);

  const selDayData = selectedDate ? dayMap.get(selectedDate) : null;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20" style={{ background: 'var(--bg-primary)' }}>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 pt-10 pb-6">
          <h1 className="ds-h1 mb-2">
            Календарь свободных дат
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Выберите дату — увидите все доступные туры на Камчатке
          </p>
        </section>

        <div className="max-w-5xl mx-auto px-4 pb-16">

          {/* ── Фильтры + сводка ────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              {ACTIVITIES.map(a => (
                <button key={a.value}
                  onClick={() => setActivity(a.value)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    borderColor: activity === a.value ? 'var(--accent)' : 'var(--border)',
                    background:  activity === a.value ? 'var(--accent)' : 'transparent',
                    color:       activity === a.value ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {a.label}
                </button>
              ))}
            </div>
            {!loadingMonth && daysWithAvail > 0 && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {daysWithAvail} дней
                </span>
                {' '}с турами · {totalTours} слотов
                {minPrice !== null && (
                  <> · от <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                    {RUB(minPrice)}
                  </span></>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-5 items-start">

            {/* ── Календарная сетка ──────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              <div className="ds-card p-4">
                {/* Навигация */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth}
                    disabled={year === now.getFullYear() && month === now.getMonth() + 1}
                    className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30">
                    <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                    {MONTHS_RU[month - 1]} {year}
                  </h2>
                  <button onClick={nextMonth}
                    className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                    <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>

                {/* Заголовки дней недели */}
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {WEEKDAYS.map(w => (
                    <div key={w} className="text-center text-[11px] font-bold uppercase py-1"
                      style={{ color: 'var(--text-muted)' }}>{w}</div>
                  ))}
                </div>

                {/* Ячейки */}
                {loadingMonth ? (
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-lg animate-pulse"
                        style={{ background: 'var(--bg-hover)' }} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1.5">
                    {cells.map((day, i) => {
                      if (!day) return <div key={`e-${i}`} />;
                      const iso     = toISO(year, month, day);
                      const isPast  = iso < todayISO;
                      const dayData = dayMap.get(iso);
                      const count   = dayData?.tourCount ?? 0;
                      const isToday = iso === todayISO;
                      const isSel   = selectedDate === iso;

                      return (
                        <button
                          key={iso}
                          onClick={() => { if (!isPast) void selectDay(iso); }}
                          disabled={isPast}
                          title={count > 0 ? `${count} туров` : undefined}
                          className={[
                            'relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all text-sm font-semibold',
                            !isPast && count > 0 ? 'cursor-pointer hover:scale-105 hover:shadow-md' : '',
                            isPast ? 'opacity-25 cursor-default' : '',
                            isSel  ? 'ring-2 ring-white shadow-lg scale-105' : '',
                            isToday && !isSel ? 'ring-2 ring-[var(--ocean)]/50' : '',
                          ].filter(Boolean).join(' ')}
                          style={{
                            background: dayBg(count, isSel),
                            color:      isSel ? '#fff' : count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          }}
                        >
                          <span>{day}</span>
                          {count > 0 && !isSel && (
                            <span className="text-[8px] font-bold leading-none mt-0.5"
                              style={{ color: count >= 4 ? 'var(--accent)' : 'var(--ocean)' }}>
                              {count} тур{count === 1 ? '' : count <= 4 ? 'а' : 'ов'}
                            </span>
                          )}
                          {isSel && count > 0 && (
                            <span className="text-[8px] font-bold leading-none mt-0.5 text-white/80">
                              {count} тур{count === 1 ? '' : count <= 4 ? 'а' : 'ов'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Легенда */}
                {!loadingMonth && (
                  <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t text-[10px]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded"
                        style={{ background: 'rgba(37,104,176,0.22)' }} />
                      1–3 тура
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded"
                        style={{ background: 'rgba(212,74,12,0.22)' }} />
                      4–6 туров
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded"
                        style={{ background: 'rgba(212,74,12,0.30)' }} />
                      7+ туров
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Правая панель ──────────────────────────────────────────── */}
            <div className="w-80 shrink-0 space-y-3">

              {selectedDate ? (
                <>
                  {/* Заголовок дня */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm capitalize"
                        style={{ color: 'var(--text-primary)' }}>
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', {
                          weekday: 'long', day: 'numeric', month: 'long',
                        })}
                      </div>
                      {selDayData && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {selDayData.tourCount} тур{selDayData.tourCount === 1 ? '' : selDayData.tourCount <= 4 ? 'а' : 'ов'} · {selDayData.freeSlots} мест
                          {selDayData.priceFrom !== null && (
                            <> · от {RUB(selDayData.priceFrom)}</>
                          )}
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setSelectedDate(null); setDayTours([]); }}>
                      <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>

                  {/* Список туров */}
                  {loadingDay ? (
                    <div className="space-y-3">
                      {[1,2].map(i => (
                        <div key={i} className="ds-card p-4 space-y-2 animate-pulse">
                          <div className="h-4 w-3/4 rounded" style={{ background: 'var(--bg-hover)' }} />
                          <div className="h-3 w-1/2 rounded" style={{ background: 'var(--bg-hover)' }} />
                          <div className="h-8 w-full rounded" style={{ background: 'var(--bg-hover)' }} />
                        </div>
                      ))}
                    </div>
                  ) : dayTours.length === 0 ? (
                    <div className="ds-card p-6 text-center">
                      <TrendingDown className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Нет доступных туров на этот день
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Попробуйте другую дату
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                      {dayTours.map(tour => (
                        <TourCard
                          key={tour.tourId}
                          tour={tour}
                          selectedDate={selectedDate}
                          onBook={t => setBookingTour(t)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Подсказка */
                <div className="ds-card p-6 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent)/10' }}>
                    <CalendarDays className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Выберите дату
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Нажмите на цветной день — увидите все доступные туры
                    </p>
                  </div>
                  {!loadingMonth && daysWithAvail === 0 && (
                    <div className="w-full pt-2 border-t text-xs text-center"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      В этом месяце нет открытых туров
                    </div>
                  )}
                  {!loadingMonth && daysWithAvail > 0 && (
                    <div className="flex items-center gap-1.5 text-xs"
                      style={{ color: 'var(--success)' }}>
                      <Zap className="w-3.5 h-3.5" />
                      {daysWithAvail} дней с доступными турами
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Модал бронирования */}
      {bookingTour && (
        <TourPaymentModal
          open={bookingTour !== null}
          onClose={() => setBookingTour(null)}
          tourId={bookingTour.tourId}
          tourName={bookingTour.title}
          operatorName={bookingTour.operator.name}
          priceBase={bookingTour.price}
          minGroupSize={null}
          maxGroupSize={bookingTour.availableSlots}
          nextDeparture={selectedDate}
        />
      )}
    </>
  );
}
