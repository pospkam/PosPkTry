'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, CloudLightning, RefreshCw,
  Plus, X, CheckCircle, AlertTriangle, XCircle, Cloud,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourOption {
  id: string;
  title: string;
  weather_dependent: boolean;
}

interface SlotData {
  id: string;
  date: string; // YYYY-MM-DD
  available_slots: number;
  booked_slots: number;
  base_price_override: number | null;
  weather_status: 'unknown' | 'ok' | 'alert' | 'cancelled';
  is_cancelled: boolean;
  cancellation_reason: string | null;
}

interface WeatherCheck {
  weather_status: 'ok' | 'alert';
  tour_title: string;
  issues: string[];
  weather: {
    wind_speed_kmh: number;
    precipitation_mm: number;
    temperature_c: number;
    visibility_m: number;
  };
  thresholds: {
    max_wind_kmh: number;
    max_precipitation_mm: number;
    min_visibility_m: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  r.setDate(1);
  return r;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WeatherDot({ status }: { status: SlotData['weather_status'] }) {
  const cls: Record<string, string> = {
    ok:        'bg-[var(--success)]',
    alert:     'bg-[var(--warning)]',
    cancelled: 'bg-[var(--danger)]',
    unknown:   'bg-[var(--text-muted)]',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls[status] ?? cls.unknown}`} />;
}

function SlotCell({
  date,
  slot,
  selected,
  isToday,
  isPast,
  onClick,
}: {
  date: Date;
  slot: SlotData | null;
  selected: boolean;
  isToday: boolean;
  isPast: boolean;
  onClick: () => void;
}) {
  const freeSlots = slot ? slot.available_slots - slot.booked_slots : null;
  const full = slot ? freeSlots === 0 : false;
  const low  = slot ? (freeSlots !== null && freeSlots > 0 && freeSlots < 3) : false;

  return (
    <button
      onClick={onClick}
      disabled={isPast}
      className={[
        'aspect-square rounded-md border p-1.5 text-left transition-all min-h-[54px]',
        'flex flex-col justify-between',
        isPast    ? 'opacity-40 cursor-default border-[var(--border)] bg-[var(--bg-hover)]'
                  : 'cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]',
        isToday   ? 'border-[var(--accent)] border-2 bg-[var(--bg-primary)]'
                  : 'border-[var(--border)] bg-[var(--bg-primary)]',
        selected  ? 'ring-2 ring-[var(--accent)] ring-offset-1' : '',
        slot?.is_cancelled ? 'bg-[var(--danger)]/5' : '',
      ].filter(Boolean).join(' ')}
    >
      <span className={[
        'text-xs font-semibold leading-none',
        isToday  ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]',
      ].join(' ')}>
        {date.getDate()}
      </span>

      {slot && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <WeatherDot status={slot.weather_status} />
            <span className={[
              'text-[10px] leading-none font-medium',
              full ? 'text-[var(--danger)]'
                   : low ? 'text-[var(--warning)]'
                          : 'text-[var(--success)]',
            ].join(' ')}>
              {slot.booked_slots}/{slot.available_slots}
            </span>
          </div>
          {slot.is_cancelled && (
            <span className="text-[9px] text-[var(--danger)] leading-none">отмена</span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarPageClient() {
  const [tours, setTours]           = useState<TourOption[]>([]);
  const [tourId, setTourId]         = useState<string>('');
  const [month, setMonth]           = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [slots, setSlots]           = useState<SlotData[]>([]);
  const [loading, setLoading]       = useState(false);
  const [toursLoading, setToursLoading] = useState(true);

  // Selection for bulk add
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSlots, setAddSlots]     = useState('8');
  const [addPrice, setAddPrice]     = useState('');
  const [saving, setSaving]         = useState(false);

  // Weather check
  const [weather, setWeather]       = useState<WeatherCheck | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // ── Load tours ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/hub/operator/tours?limit=100')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTours(d.data);
          if (d.data.length > 0) setTourId(String(d.data[0].id));
        }
      })
      .catch(() => undefined)
      .finally(() => setToursLoading(false));
  }, []);

  // ── Load availability ───────────────────────────────────────────────────────
  const loadSlots = useCallback(async () => {
    if (!tourId) return;
    setLoading(true);
    setSelected(new Set());

    const from = toISO(month);
    const end  = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const to   = toISO(end);

    try {
      const r = await fetch(`/api/hub/operator/tours/${tourId}/availability?from=${from}&to=${to}`);
      const d = await r.json();
      if (d.success) setSlots(d.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [tourId, month]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // ── Weather check ───────────────────────────────────────────────────────────
  const checkWeather = async () => {
    if (!tourId) return;
    setWeatherLoading(true);
    setWeather(null);
    try {
      const r = await fetch(`/api/hub/operator/weather?tour_id=${tourId}`);
      const d = await r.json();
      if (d.success) setWeather(d);
    } catch {
      // non-fatal
    } finally {
      setWeatherLoading(false);
    }
  };

  // ── Calendar grid ───────────────────────────────────────────────────────────
  const slotMap = new Map(slots.map(s => [s.date, s]));

  const days: (Date | null)[] = [];
  const firstDay  = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay   = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startDow  = firstDay.getDay(); // 0=Sun
  const leadBlanks = startDow === 0 ? 6 : startDow - 1; // Mo-first grid
  for (let i = 0; i < leadBlanks; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(month.getFullYear(), month.getMonth(), i));

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const toggleDate = (d: Date) => {
    const key = toISO(d);
    if (d < today) return;
    setSelected(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
    if (!showAddForm && selected.size === 0) setShowAddForm(true);
  };

  // ── Add availability ────────────────────────────────────────────────────────
  const handleAddAvailability = async () => {
    if (selected.size === 0 || !tourId) return;
    setSaving(true);
    try {
      const dates = Array.from(selected).map(date => ({
        date,
        available_slots: parseInt(addSlots) || 8,
        ...(addPrice ? { price_override: parseFloat(addPrice) } : {}),
      }));

      const r = await fetch(`/api/hub/operator/tours/${tourId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates }),
      });

      if (r.ok) {
        setSelected(new Set());
        setShowAddForm(false);
        setAddPrice('');
        await loadSlots();
      }
    } catch {
      // non-fatal
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const INPUT = 'px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  const currentTour = tours.find(t => String(t.id) === tourId);

  return (
    <div className="p-5 lg:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Календарь доступности</h1>
          <p className="text-[var(--text-muted)] mt-0.5 text-sm">Управляйте датами и местами</p>
        </div>

        {/* Tour selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {toursLoading ? (
            <span className="text-sm text-[var(--text-muted)]">Загрузка туров...</span>
          ) : tours.length === 0 ? (
            <span className="text-sm text-[var(--text-muted)]">Нет туров</span>
          ) : (
            <select
              value={tourId}
              onChange={e => { setTourId(e.target.value); setWeather(null); }}
              className={INPUT + ' min-w-[200px]'}
            >
              {tours.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          )}

          {currentTour?.weather_dependent && (
            <button
              onClick={checkWeather}
              disabled={weatherLoading || !tourId}
              className="ds-btn ds-btn-secondary flex items-center gap-1.5 text-sm"
            >
              {weatherLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudLightning className="w-3.5 h-3.5" />
              )}
              Погода
            </button>
          )}
        </div>
      </div>

      {/* Weather panel */}
      {weather && (
        <div className={[
          'rounded-lg border p-4 text-sm',
          weather.weather_status === 'ok'
            ? 'border-[var(--success)] bg-[var(--success)]/5'
            : 'border-[var(--warning)] bg-[var(--warning)]/5',
        ].join(' ')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              {weather.weather_status === 'ok' ? (
                <CheckCircle className="w-4 h-4 text-[var(--success)]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
              )}
              {weather.weather_status === 'ok' ? 'Погода в норме' : 'Погодный алерт'}
            </div>
            <button onClick={() => setWeather(null)}>
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </div>
          <div className="mt-2 flex gap-4 text-[var(--text-secondary)] flex-wrap">
            <span>Ветер: {weather.weather.wind_speed_kmh} км/ч (лим: {weather.thresholds.max_wind_kmh})</span>
            <span>Осадки: {weather.weather.precipitation_mm} мм (лим: {weather.thresholds.max_precipitation_mm})</span>
            <span>Видимость: {(weather.weather.visibility_m / 1000).toFixed(1)} км</span>
            <span>Темп: {weather.weather.temperature_c}°C</span>
          </div>
          {weather.issues.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {weather.issues.map((issue, i) => (
                <li key={i} className="text-[var(--warning)] flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">

        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <button
            onClick={() => setMonth(m => addMonths(m, -1))}
            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-[var(--text-primary)] capitalize">
            {month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setMonth(m => addMonths(m, 1))}
            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
              <div key={d} className="text-center text-[9px] uppercase tracking-widest text-[var(--text-muted)] py-1">{d}</div>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-md bg-[var(--bg-hover)] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((date, i) => {
                if (!date) return <div key={`b-${i}`} className="aspect-square" />;
                const key  = toISO(date);
                const slot = slotMap.get(key) ?? null;
                const isPast = date < today;
                const isToday = date.toDateString() === today.toDateString();
                return (
                  <SlotCell
                    key={key}
                    date={date}
                    slot={slot}
                    selected={selected.has(key)}
                    isToday={isToday}
                    isPast={isPast}
                    onClick={() => toggleDate(date)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-[var(--text-muted)] flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--success)]" />Норма</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--warning)]" />Погодный алерт</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--danger)]" />Отменено</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />Неизвестно</span>
          <span className="ml-auto text-[var(--text-muted)]">Нажмите на дату чтобы выбрать</span>
        </div>
      </div>

      {/* Add availability form (appears when dates selected) */}
      {(selected.size > 0 || showAddForm) && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--accent)] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-semibold text-sm text-[var(--text-primary)]">
                Добавить доступность
                {selected.size > 0 && (
                  <span className="ml-1.5 text-[var(--accent)]">({selected.size} {selected.size === 1 ? 'день' : 'дней'})</span>
                )}
              </span>
            </div>
            <button
              onClick={() => { setShowAddForm(false); setSelected(new Set()); }}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selected.size === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Выберите даты на календаре выше</p>
          ) : (
            <>
              {/* Selected dates */}
              <div className="flex flex-wrap gap-1.5">
                {Array.from(selected).sort().map(d => (
                  <span key={d} className="flex items-center gap-1 text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full">
                    {new Date(d + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    <button onClick={() => {
                      setSelected(prev => { const n = new Set(prev); n.delete(d); return n; });
                    }}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Form fields */}
              <div className="flex gap-3 flex-wrap">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-muted)]">Мест</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={addSlots}
                    onChange={e => setAddSlots(e.target.value)}
                    className={INPUT + ' w-24'}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-muted)]">Цена (необязательно)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Стандартная"
                    value={addPrice}
                    onChange={e => setAddPrice(e.target.value)}
                    className={INPUT + ' w-40'}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddAvailability}
                    disabled={saving}
                    className="ds-btn ds-btn-primary flex items-center gap-1.5 text-sm"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Cloud className="w-3.5 h-3.5" />
                    )}
                    {saving ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !toursLoading && tourId && slots.length === 0 && selected.size === 0 && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <Cloud className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Нет доступных дат в этом месяце</p>
          <p className="text-xs mt-1">Нажмите на дату в календаре чтобы добавить</p>
        </div>
      )}
    </div>
  );
}
