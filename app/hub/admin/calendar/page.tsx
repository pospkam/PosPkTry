'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, AlertTriangle,
  TrendingUp, TrendingDown, CalendarDays, Users,
  BarChart3, Award, Minus,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DayData {
  date: string;
  total: number;
  new: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  revenue: number;
  activeOperators: number;
  activeTours: number;
  participants: number;
  cancellationRate: number | null;
  demandScore: number; // 0.0–1.0
  isAnomaly: boolean;
}

interface TopTour {
  tourTitle: string;
  operatorName: string;
  bookings: number;
  revenue: number;
}

interface Summary {
  revenue: number;
  bookings: number;
  new: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  cancellationRate: number;
  vsLastMonth: { revenue: number | null; bookings: number | null };
}

interface Anomaly {
  date: string;
  cancellation_rate: number;
  total_bookings: number;
  cancelled: number;
}

interface CalendarData {
  month: string;
  days: DayData[];
  topTours: TopTour[];
  summary: Summary;
  anomalies: Anomaly[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const RUB = (v: number) => v.toLocaleString('ru-RU') + ' ₽';

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

/** Цвет ячейки по demand score (0=пусто, 1=макс выручка) */
function demandColor(score: number, isAnomaly: boolean): string {
  if (isAnomaly)  return 'rgba(220,38,38,0.18)';   // красный — аномалия отмен
  if (score <= 0) return 'transparent';
  if (score < 0.2) return 'rgba(63,185,80,0.10)';  // слабый — зелёный
  if (score < 0.5) return 'rgba(63,185,80,0.22)';
  if (score < 0.8) return 'rgba(210,153,34,0.22)'; // средний — жёлтый
  return 'rgba(210,153,34,0.38)';                   // высокий — оранжевый
}

function deltaIcon(val: number | null) {
  if (val === null) return <Minus className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />;
  if (val > 0)  return <TrendingUp   className="w-3 h-3" style={{ color: 'var(--success)' }} />;
  if (val < 0)  return <TrendingDown className="w-3 h-3" style={{ color: 'var(--danger)'  }} />;
  return <Minus className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />;
}

// ─── DayCell ───────────────────────────────────────────────────────────────────

function DayCell({
  day, iso, dayData, isToday, isPast, selected, onClick,
}: {
  day: number;
  iso: string;
  dayData: DayData | null;
  isToday: boolean;
  isPast: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const hasData = dayData !== null && dayData.total > 0;
  const bg      = dayData ? demandColor(dayData.demandScore, dayData.isAnomaly) : 'transparent';

  return (
    <button
      onClick={onClick}
      className={[
        'relative flex flex-col items-start p-1.5 rounded-lg border transition-all text-left w-full min-h-[58px] sm:min-h-[68px]',
        selected   ? 'border-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/30' : '',
        isToday && !selected ? 'border-[var(--ocean)]/50' : '',
        !selected && !isToday ? 'border-[var(--border)] hover:border-[var(--accent)]/30' : '',
        isPast && !hasData ? 'opacity-30' : '',
      ].filter(Boolean).join(' ')}
      style={{ background: selected ? 'var(--bg-hover)' : bg }}
    >
      <span className={[
        'text-[11px] font-semibold leading-none',
        isToday   ? 'text-[var(--ocean)]'         : '',
        selected  ? 'text-[var(--accent)]'         : 'text-[var(--text-secondary)]',
      ].filter(Boolean).join(' ')}>
        {day}
      </span>

      {hasData && (
        <div className="mt-0.5 space-y-0.5 w-full">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold px-1 rounded"
              style={{ background: 'var(--success)', color: '#fff' }}>
              {dayData!.total}
            </span>
            {dayData!.isAnomaly && (
              <AlertTriangle className="w-2.5 h-2.5" style={{ color: 'var(--danger)' }} />
            )}
          </div>
          {dayData!.revenue > 0 && (
            <div className="text-[9px] leading-none truncate" style={{ color: 'var(--text-secondary)' }}>
              {dayData!.revenue >= 1_000_000
                ? (dayData!.revenue / 1_000_000).toFixed(1) + 'М'
                : dayData!.revenue >= 1_000
                  ? Math.round(dayData!.revenue / 1_000) + 'K'
                  : String(dayData!.revenue)
              }₽
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function AdminCalendar() {
  const now   = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState<CalendarData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const m   = `${year}-${String(month).padStart(2,'0')}`;
      const res = await fetch(`/api/admin/calendar?month=${m}`);
      const json: CalendarData & { success: boolean; error?: string } = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
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

  // Сетка дней
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO  = toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const dayMap    = new Map(data?.days.map(d => [d.date, d]) ?? []);
  const summary   = data?.summary;
  const selDay    = selectedDate ? dayMap.get(selectedDate) ?? null : null;

  if (error) {
    return (
      <div className="p-6">
        <div className="ds-card p-6 max-w-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Ошибка загрузки</span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{error}</p>
          <button onClick={load} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <RefreshCw className="w-3 h-3" /> Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">

      {/* ── Заголовок ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Календарь платформы
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Спрос · Выручка · Аномалии по всем операторам
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="ds-btn flex items-center gap-1.5 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* ── Сводка месяца ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              label: 'Выручка',
              value: RUB(summary.revenue),
              delta: summary.vsLastMonth.revenue,
              color: 'var(--accent)',
            },
            {
              label: 'Бронирований',
              value: summary.bookings,
              delta: summary.vsLastMonth.bookings,
              color: 'var(--text-primary)',
            },
            {
              label: 'Подтверждено',
              value: summary.confirmed,
              delta: null,
              color: 'var(--success)',
            },
            {
              label: '% отмен',
              value: summary.cancellationRate + '%',
              delta: null,
              color: summary.cancellationRate >= 30 ? 'var(--danger)' : 'var(--text-primary)',
            },
          ].map(s => (
            <div key={s.label} className="ds-card p-3">
              <div className="flex items-center gap-1 mb-1">
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                {s.delta !== null && (
                  <div className="flex items-center gap-0.5">
                    {deltaIcon(s.delta)}
                    <span className="text-[10px]" style={{
                      color: s.delta > 0 ? 'var(--success)' : s.delta < 0 ? 'var(--danger)' : 'var(--text-muted)',
                    }}>
                      {s.delta !== null ? `${s.delta > 0 ? '+' : ''}${s.delta}%` : ''}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Аномалии ──────────────────────────────────────────────────────── */}
      {data && data.anomalies.length > 0 && (
        <div className="ds-card p-3 border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
              {data.anomalies.length} дней с высоким % отмен
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.anomalies.map(a => (
              <button
                key={a.date}
                onClick={() => setSelectedDate(a.date)}
                className="text-xs px-2 py-1 rounded-md border transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                {new Date(a.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                {' '}— {Math.round(a.cancellation_rate * 100)}% отмен ({a.cancelled}/{a.total_bookings})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Основной layout ───────────────────────────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* ── Календарная сетка ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Навигация */}
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
                style={{ color: 'var(--text-muted)' }}>
                {w}
              </div>
            ))}
          </div>

          {/* Ячейки */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--bg-hover)] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const iso    = toISO(year, month, day);
                const isPast = iso < todayISO;
                return (
                  <DayCell
                    key={iso}
                    day={day}
                    iso={iso}
                    dayData={dayMap.get(iso) ?? null}
                    isToday={iso === todayISO}
                    isPast={isPast}
                    selected={selectedDate === iso}
                    onClick={() => setSelectedDate(prev => prev === iso ? null : iso)}
                  />
                );
              })}
            </div>
          )}

          {/* Легенда */}
          <div className="flex flex-wrap gap-3 mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: 'rgba(63,185,80,0.22)' }} />
              Низкий спрос
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: 'rgba(210,153,34,0.38)' }} />
              Высокий спрос
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: 'rgba(220,38,38,0.18)' }} />
              Аномалия (отмены)
            </span>
          </div>
        </div>

        {/* ── Правый сайдбар ────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 space-y-3">

          {/* Детали выбранного дня */}
          {selDay ? (
            <div className="ds-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {new Date(selectedDate! + 'T12:00:00').toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', weekday: 'short',
                    })}
                  </span>
                </div>
                <button onClick={() => setSelectedDate(null)}
                  className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Бронирований', value: selDay.total,       color: 'var(--text-primary)' },
                  { label: 'Выручка',      value: RUB(selDay.revenue), color: 'var(--accent)'       },
                  { label: 'Подтверждено', value: selDay.confirmed,    color: 'var(--success)'      },
                  { label: 'Отменено',     value: selDay.cancelled,    color: 'var(--danger)'       },
                  { label: 'Операторы',    value: selDay.activeOperators, color: 'var(--ocean)'     },
                  { label: 'Туристы',      value: selDay.participants,    color: 'var(--text-primary)' },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-lg"
                    style={{ background: 'var(--bg-hover)' }}>
                    <div className="font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {selDay.isAnomaly && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--danger)', background: 'rgba(220,38,38,0.06)' }}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--danger)' }} />
                  <span className="text-xs" style={{ color: 'var(--danger)' }}>
                    Высокий % отмен: {Math.round((selDay.cancellationRate ?? 0) * 100)}%
                  </span>
                </div>
              )}

              <div className="pt-1">
                <div className="text-[10px] mb-1.5 font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}>Уровень спроса</div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round(selDay.demandScore * 100)}%`,
                      background: selDay.demandScore >= 0.8
                        ? 'var(--warning)'
                        : selDay.demandScore >= 0.4
                          ? 'var(--ocean)'
                          : 'var(--success)',
                    }} />
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {Math.round(selDay.demandScore * 100)}% от пикового дня месяца
                </div>
              </div>
            </div>
          ) : (
            <div className="ds-card p-5 text-center flex flex-col items-center gap-2">
              <BarChart3 className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Нажмите на день чтобы увидеть детали
              </p>
            </div>
          )}

          {/* Топ туров */}
          {data && data.topTours.length > 0 && (
            <div className="ds-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Топ туров месяца
                </span>
              </div>
              <div className="space-y-2">
                {data.topTours.map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-bold w-4 shrink-0 mt-0.5"
                      style={{ color: i === 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {t.tourTitle}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {t.operatorName} · {t.bookings} броней
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--success)' }}>
                      {t.revenue >= 1000 ? Math.round(t.revenue / 1000) + 'K' : t.revenue}₽
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Статистика месяца */}
          {summary && (
            <div className="ds-card p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Итог месяца
                </span>
              </div>
              {[
                { label: 'Новых',      value: summary.new,      color: 'var(--warning)' },
                { label: 'Завершено',  value: summary.completed,color: 'var(--ocean)'   },
                { label: 'Отменено',   value: summary.cancelled, color: 'var(--danger)' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span className="font-semibold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
