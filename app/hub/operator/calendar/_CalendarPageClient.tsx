'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, Check, X,
  Phone, Mail, Users, CalendarDays, CloudLightning,
  AlertCircle, CheckCircle2, Clock, Ban, Download,
  TrendingUp, TrendingDown, Zap, Minus, FolderOpen,
} from 'lucide-react';
import FreeDatesPanel from './_FreeDatesPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  tour_title: string;
  tourist_name: string | null;
  tourist_phone: string | null;
  tourist_email: string | null;
  participants: number;
  final_price: string | null;
  payment_status: string;
  booking_status: 'new' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  special_requests: string | null;
  created_at: string;
}

interface AvailSlot {
  tour_id: string;
  tour_title: string;
  available_slots: number;
  booked_slots: number;
  weather_status: string;
  is_cancelled: boolean;
}

interface DaySummary {
  date: string;
  bookings: Booking[];
  avail: AvailSlot[];
  revenue: number;
  newCount: number;
  confirmedCount: number;
}

interface CalendarData {
  bookings_by_date: Record<string, Booking[]>;
  availability_by_date: Record<string, AvailSlot[]>;
  summary: {
    total: number;
    new: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    revenue: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS   = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU  = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

const STATUS_META: Record<string, { label: string; color: string; Icon: typeof Check }> = {
  new:       { label: 'Новая',        color: 'var(--warning)',     Icon: Clock        },
  confirmed: { label: 'Подтверждена', color: 'var(--success)',     Icon: CheckCircle2 },
  cancelled: { label: 'Отменена',     color: 'var(--danger)',      Icon: Ban          },
  completed: { label: 'Завершена',    color: 'var(--ocean)',       Icon: CheckCircle2 },
  no_show:   { label: 'Не явился',    color: 'var(--text-muted)',  Icon: X            },
};

const PAY_LABEL: Record<string, string> = {
  pending: 'Ожидает оплаты', paid: 'Оплачено',
  failed: 'Ошибка оплаты',   refunded: 'Возврат',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RUB = (v: string | number | null) =>
  v == null ? '—' : Number(v).toLocaleString('ru-RU') + ' ₽';

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function dayRevenue(bookings: Booking[]): number {
  return bookings
    .filter(b => b.booking_status !== 'cancelled')
    .reduce((s, b) => s + Number(b.final_price ?? 0), 0);
}

/** Интенсивность окраски ячейки по выручке (0–1) */
function revenueColor(rev: number, maxRev: number): string {
  if (rev <= 0 || maxRev <= 0) return 'transparent';
  const intensity = rev / maxRev;
  if (intensity < 0.25) return 'rgba(37,104,176,0.10)'; // ocean очень слабый
  if (intensity < 0.5)  return 'rgba(37,104,176,0.20)';
  if (intensity < 0.75) return 'rgba(212,74,12,0.18)';  // accent средний
  return 'rgba(212,74,12,0.32)';                         // accent сильный
}

// ─── Revenue Insight ──────────────────────────────────────────────────────────

interface Insight {
  type: 'high' | 'low' | 'anomaly';
  label: string;
  value: string;
}

function buildInsights(data: CalendarData, maxRev: number): Insight[] {
  const allDates = Object.entries(data.bookings_by_date);
  const insights: Insight[] = [];

  // Топ день по выручке
  const topDay = allDates.reduce<[string, number] | null>((best, [date, bks]) => {
    const rev = dayRevenue(bks);
    if (!best || rev > best[1]) return [date, rev];
    return best;
  }, null);
  if (topDay && topDay[1] > 0) {
    insights.push({
      type: 'high',
      label: 'Лучший день',
      value: `${new Date(topDay[0] + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${RUB(topDay[1])}`,
    });
  }

  // Дни с высоким спросом (выручка > 75% от макс) — рекомендация поднять цену
  const highDays = allDates.filter(([, bks]) => dayRevenue(bks) >= maxRev * 0.75);
  if (highDays.length >= 2) {
    insights.push({
      type: 'high',
      label: `${highDays.length} дня с высоким спросом`,
      value: 'Рассмотрите повышение цены',
    });
  }

  // Дни без бронирований в прошлом (только рабочие)
  const cancelDays = allDates.filter(([, bks]) =>
    bks.length >= 2 && bks.filter(b => b.booking_status === 'cancelled').length / bks.length >= 0.5
  );
  if (cancelDays.length > 0) {
    insights.push({
      type: 'anomaly',
      label: `${cancelDays.length} дней с >50% отмен`,
      value: 'Проверьте причины',
    });
  }

  return insights;
}

// ─── Day Cell ─────────────────────────────────────────────────────────────────

function DayCell({
  day, year, month, data, maxRev, selected, isToday, isPast, onClick,
}: {
  day: number; year: number; month: number;
  data: CalendarData | null; maxRev: number;
  selected: boolean; isToday: boolean; isPast: boolean;
  onClick: () => void;
}) {
  const iso      = toISO(year, month, day);
  const bookings = data?.bookings_by_date[iso] ?? [];
  const avail    = data?.availability_by_date[iso] ?? [];
  const rev      = dayRevenue(bookings);
  const newCount = bookings.filter(b => b.booking_status === 'new').length;
  const confCnt  = bookings.filter(b => b.booking_status === 'confirmed').length;
  const totalSlots  = avail.reduce((s, a) => s + a.available_slots, 0);
  const bookedSlots = avail.reduce((s, a) => s + a.booked_slots, 0);
  const weatherAlert = avail.some(a => a.weather_status === 'alert');
  const isCancelled  = avail.some(a => a.is_cancelled);
  const hasBookings  = bookings.length > 0;

  const bg = selected
    ? 'var(--bg-hover)'
    : rev > 0
      ? revenueColor(rev, maxRev)
      : 'transparent';

  return (
    <button
      onClick={onClick}
      disabled={isPast && !hasBookings}
      className={[
        'relative flex flex-col items-start p-1.5 sm:p-2 rounded-lg border transition-all text-left w-full min-h-[60px] sm:min-h-[72px]',
        selected       ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/30 shadow-sm' : '',
        isToday && !selected ? 'border-[var(--ocean)]/40' : '',
        !selected && !isToday ? 'border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--bg-hover)]' : '',
        isPast && !hasBookings ? 'opacity-30 cursor-default' : 'cursor-pointer',
      ].filter(Boolean).join(' ')}
      style={{ background: bg }}
    >
      {/* Day number */}
      <span className={[
        'text-xs font-semibold leading-none mb-1',
        isToday  ? 'text-[var(--ocean)]'   : '',
        selected ? 'text-[var(--accent)]'  : 'text-[var(--text-secondary)]',
      ].filter(Boolean).join(' ')}>
        {day}
      </span>

      {/* Revenue */}
      {rev > 0 && (
        <div className="text-[9px] leading-none font-bold mb-0.5"
          style={{ color: 'var(--accent)' }}>
          {rev >= 1_000_000 ? (rev / 1_000_000).toFixed(1) + 'М' : rev >= 1_000 ? Math.round(rev / 1_000) + 'K' : rev}₽
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-0.5 w-full">
        {newCount > 0 && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded"
            style={{ background: 'var(--warning)', color: '#fff' }}>
            {newCount}
          </span>
        )}
        {confCnt > 0 && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded"
            style={{ background: 'var(--success)', color: '#fff' }}>
            {confCnt}
          </span>
        )}
      </div>

      {/* Slot fill */}
      {totalSlots > 0 && (
        <span className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {bookedSlots}/{totalSlots}
        </span>
      )}

      {/* Weather / cancelled */}
      <div className="absolute top-1 right-1 flex gap-0.5">
        {weatherAlert && <CloudLightning className="w-2.5 h-2.5" style={{ color: 'var(--warning)' }} />}
        {isCancelled  && <X className="w-2.5 h-2.5" style={{ color: 'var(--danger)' }} />}
      </div>
    </button>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking, onStatusChange, updating,
}: {
  booking: Booking;
  onStatusChange: (id: string, status: string) => void;
  updating: string | null;
}) {
  const meta       = STATUS_META[booking.booking_status] ?? STATUS_META.new;
  const StIcon     = meta.Icon;
  const isUpdating = updating === booking.id;

  return (
    <div className="ds-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {booking.tour_title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {booking.tourist_name ?? 'Имя не указано'} · {booking.participants} чел
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StIcon className="w-3.5 h-3.5" style={{ color: meta.color }} />
          <span className="text-[11px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
        </div>
      </div>

      <div className="space-y-1">
        {booking.tourist_phone && (
          <a href={`tel:${booking.tourist_phone}`}
            className="flex items-center gap-1.5 text-xs hover:underline"
            style={{ color: 'var(--ocean)' }}>
            <Phone className="w-3 h-3" />{booking.tourist_phone}
          </a>
        )}
        {booking.tourist_email && (
          <a href={`mailto:${booking.tourist_email}`}
            className="flex items-center gap-1.5 text-xs hover:underline"
            style={{ color: 'var(--ocean)' }}>
            <Mail className="w-3 h-3" />{booking.tourist_email}
          </a>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--text-primary)' }}>{RUB(booking.final_price)}</span>
        <span style={{ color: booking.payment_status === 'paid' ? 'var(--success)' : 'var(--warning)' }}>
          {PAY_LABEL[booking.payment_status] ?? booking.payment_status}
        </span>
      </div>

      {booking.special_requests && (
        <p className="text-xs p-2 rounded"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
          {booking.special_requests}
        </p>
      )}

      {(booking.booking_status === 'new' || booking.booking_status === 'confirmed') && (
        <div className="flex gap-2">
          {booking.booking_status === 'new' && (
            <button onClick={() => onStatusChange(booking.id, 'confirmed')}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'var(--success)', color: '#fff' }}>
              {isUpdating
                ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                : <Check className="w-3.5 h-3.5" />}
              Подтвердить
            </button>
          )}
          <button onClick={() => onStatusChange(booking.id, 'cancelled')}
            disabled={isUpdating}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-[var(--danger)]/10"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            <X className="w-3.5 h-3.5" />
            {booking.booking_status === 'new' ? 'Отклонить' : 'Отменить'}
          </button>
          {booking.booking_status === 'confirmed' && (
            <button onClick={() => onStatusChange(booking.id, 'completed')}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'var(--ocean)', color: '#fff' }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Завершить
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarPageClient() {
  const now = new Date();
  const [tab, setTab] = useState<'bookings' | 'free-dates'>('bookings');
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState<CalendarData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [updating, setUpdating]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m   = `${year}-${String(month).padStart(2,'0')}`;
      const res = await fetch(`/api/hub/operator/bookings-calendar?month=${m}`);
      if (res.ok) {
        const json = await res.json() as CalendarData & { success: boolean };
        if (json.success) setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { void load(); }, [load]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch(`/api/hub/operator/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_status: status }),
      });
      await load();
    } finally {
      setUpdating(null);
    }
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

  // Максимальная выручка за день (для нормализации heatmap)
  const maxRev = data
    ? Math.max(
        ...Object.values(data.bookings_by_date).map(bks => dayRevenue(bks)),
        1
      )
    : 1;

  // Insights
  const insights = data ? buildInsights(data, maxRev) : [];

  // Выбранный день
  const selectedDay: DaySummary | null = selectedDate ? {
    date:          selectedDate,
    bookings:      data?.bookings_by_date[selectedDate] ?? [],
    avail:         data?.availability_by_date[selectedDate] ?? [],
    revenue:       dayRevenue(data?.bookings_by_date[selectedDate] ?? []),
    newCount:      (data?.bookings_by_date[selectedDate] ?? []).filter(b => b.booking_status === 'new').length,
    confirmedCount:(data?.bookings_by_date[selectedDate] ?? []).filter(b => b.booking_status === 'confirmed').length,
  } : null;

  const summary = data?.summary;

  // iCal download
  function downloadICal() {
    window.open('/api/operator/calendar/ical?months=3', '_blank');
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">

      {/* ── Заголовок ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Календарь</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Бронирования · Выручка · Управление датами
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadICal}
            className="ds-btn flex items-center gap-1.5 text-sm"
            title="Экспорт в Google/Apple Calendar">
            <Download className="w-4 h-4" />
            iCal
          </button>
          {tab === 'bookings' && (
            <button onClick={load} disabled={loading}
              className="ds-btn flex items-center gap-1.5 text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          )}
        </div>
      </div>

      {/* ── Вкладки ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-hover)' }}>
        {([
          { key: 'bookings',   label: 'Бронирования', Icon: CalendarDays },
          { key: 'free-dates', label: 'Свободные даты', Icon: FolderOpen  },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? 'var(--bg-card)' : 'transparent',
              color:      tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow:  tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            <t.Icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Вкладка: Свободные даты ─────────────────────────────────────── */}
      {tab === 'free-dates' && <FreeDatesPanel />}

      {/* ── Вкладка: Бронирования ───────────────────────────────────────── */}
      {tab === 'bookings' && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: 'Всего',        value: summary.total,       color: 'var(--text-primary)' },
            { label: 'Новых',        value: summary.new,         color: 'var(--warning)'      },
            { label: 'Подтверждено', value: summary.confirmed,   color: 'var(--success)'      },
            { label: 'Завершено',    value: summary.completed,   color: 'var(--ocean)'        },
            { label: 'Выручка',      value: RUB(summary.revenue),color: 'var(--accent)',  isText: true },
          ].map(s => (
            <div key={s.label} className="ds-card p-3 text-center">
              <div className="font-bold text-base" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Insights ────────────────────────────────────────────────────── */}
      {tab === 'bookings' && insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {insights.map((ins, i) => {
            const Icon = ins.type === 'high' ? TrendingUp : ins.type === 'low' ? TrendingDown : Zap;
            const color = ins.type === 'high' ? 'var(--success)' : ins.type === 'anomaly' ? 'var(--danger)' : 'var(--warning)';
            return (
              <div key={i} className="ds-card p-3 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {ins.label}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {ins.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Алерт новых броней ──────────────────────────────────────────── */}
      {tab === 'bookings' && summary && summary.new > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border"
          style={{ borderColor: 'var(--warning)', background: 'rgba(210,153,34,0.07)' }}>
          <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--warning)' }} />
          <div className="flex-1 text-sm">
            <span className="font-semibold" style={{ color: 'var(--warning)' }}>
              {summary.new} {summary.new === 1 ? 'новая бронь требует' : 'новых бронирования требуют'} подтверждения
            </span>
            <span style={{ color: 'var(--text-secondary)' }}> — нажмите на дату</span>
          </div>
        </div>
      )}

      {/* ── Основной layout ─────────────────────────────────────────────── */}
      {tab === 'bookings' && <div className="flex gap-4 items-start">

        {/* ── Календарная сетка ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              {MONTHS_RU[month - 1]} {year}
            </h2>
            <button onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-[10px] font-semibold py-1"
                style={{ color: 'var(--text-muted)' }}>{w}</div>
            ))}
          </div>

          {/* Ячейки */}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)]" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const iso   = toISO(year, month, day);
                const isPast = iso < todayISO;
                return (
                  <DayCell
                    key={iso}
                    day={day}
                    year={year}
                    month={month}
                    data={data}
                    maxRev={maxRev}
                    selected={selectedDate === iso}
                    isToday={iso === todayISO}
                    isPast={isPast}
                    onClick={() => setSelectedDate(prev => prev === iso ? null : iso)}
                  />
                );
              })}
            </div>
          )}

          {/* Легенда */}
          <div className="flex flex-wrap gap-3 mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded" style={{ background: 'var(--warning)' }} />
              Новые (ждут подтверждения)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded" style={{ background: 'var(--success)' }} />
              Подтверждены
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded" style={{ background: 'rgba(212,74,12,0.32)' }} />
              Высокая выручка
            </span>
            <span>0/8 — слоты: занято/всего</span>
          </div>
        </div>

        {/* ── Панель деталей ────────────────────────────────────────────── */}
        {selectedDay ? (
          <div className="w-80 shrink-0 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', weekday: 'long',
                  })}
                </span>
              </div>
              <button onClick={() => setSelectedDate(null)}>
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Revenue block */}
            {selectedDay.revenue > 0 && (
              <div className="ds-card p-3 flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Выручка дня</span>
                <span className="font-bold text-base" style={{ color: 'var(--accent)' }}>
                  {RUB(selectedDay.revenue)}
                </span>
              </div>
            )}

            {/* Availability */}
            {selectedDay.avail.length > 0 && (
              <div className="ds-card p-3 space-y-1.5">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Доступность слотов
                </p>
                {selectedDay.avail.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate" style={{ color: 'var(--text-primary)' }}>{a.tour_title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Users className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      <span style={{
                        color: a.booked_slots >= a.available_slots ? 'var(--danger)' : 'var(--success)',
                      }}>
                        {a.booked_slots}/{a.available_slots}
                      </span>
                      {a.weather_status === 'alert' && (
                        <CloudLightning className="w-3 h-3" style={{ color: 'var(--warning)' }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bookings */}
            {selectedDay.bookings.length === 0 ? (
              <div className="ds-card p-6 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Нет бронирований на этот день
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Бронирования ({selectedDay.bookings.length})
                  {selectedDay.newCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-white text-[10px]"
                      style={{ background: 'var(--warning)' }}>
                      {selectedDay.newCount} новых
                    </span>
                  )}
                </p>
                {selectedDay.bookings.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onStatusChange={handleStatusChange}
                    updating={updating}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          !loading && (
            <div className="w-64 shrink-0 ds-card p-6 text-center flex flex-col items-center gap-3">
              <CalendarDays className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Нажмите на дату чтобы увидеть бронирования и слоты
              </p>
              {summary && summary.revenue > 0 && (
                <div className="w-full border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Выручка месяца</div>
                  <div className="font-bold text-base mt-1" style={{ color: 'var(--accent)' }}>
                    {RUB(summary.revenue)}
                  </div>
                </div>
              )}
              <button onClick={downloadICal}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <Download className="w-3.5 h-3.5" />
                Скачать iCal календарь
              </button>
            </div>
          )
        )}
      </div>}
    </div>
  );
}
