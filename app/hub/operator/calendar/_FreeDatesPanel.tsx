'use client';

/**
 * _FreeDatesPanel — панель массового управления свободными датами.
 * Встраивается в /hub/operator/calendar как вкладка.
 *
 * Функции:
 * 1. Показывает туры и сколько дней открыто в ближайшие 90 дней
 * 2. Быстрое bulk-открытие: тур + диапазон + слоты + фильтр дней недели
 * 3. Индикация туров без единой открытой даты (красный алерт)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, ChevronDown, ChevronUp, CheckCircle,
  AlertTriangle, RefreshCw, Zap, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourCoverage {
  id: string;
  title: string;
  openDays: number;     // дней с открытыми слотами в ближайшие 90 дней
  totalSlots: number;   // суммарно свободных мест
  nextDate: string | null;
}

interface BulkResult {
  opened: number;
  skipped: number;
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Быстрые пресеты
const PRESETS = [
  { label: 'Каждый день',   weekdays: [] },
  { label: 'Будни',         weekdays: [0,1,2,3,4] },
  { label: 'Выходные',      weekdays: [5,6] },
  { label: 'Только Сб',     weekdays: [5] },
  { label: 'Сб + Вс',       weekdays: [5,6] },
];

function isoPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FreeDatesPanel() {
  const [tours, setTours]         = useState<TourCoverage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [openForm, setOpenForm]   = useState(false);

  // Form state
  const [formTour,      setFormTour]      = useState('');
  const [formStart,     setFormStart]     = useState(today());
  const [formEnd,       setFormEnd]       = useState(isoPlus(30));
  const [formSlots,     setFormSlots]     = useState(8);
  const [formWeekdays,  setFormWeekdays]  = useState<number[]>([]);
  const [formPrice,     setFormPrice]     = useState('');
  const [skipExisting,  setSkipExisting]  = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [result,        setResult]        = useState<BulkResult | null>(null);
  const [error,         setError]         = useState('');

  // ── Загрузка покрытия дат ──────────────────────────────────────────────────
  const loadCoverage = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Список туров оператора
      const toursRes = await fetch('/api/hub/operator/tours?page=1&limit=100');
      const toursJson: { success: boolean; data?: { tours?: { id: string; title: string }[] } } =
        await toursRes.json();
      const tourList = toursJson.data?.tours ?? [];
      if (tourList.length === 0) { setTours([]); return; }

      // 2. Для каждого тура — сколько дней открыто в ближайшие 90 дней
      const from = today();
      const to   = isoPlus(90);
      const coverageRes = await fetch(
        `/api/operator/calendar?startDate=${from}&endDate=${to}`
      );
      const coverageJson: {
        success: boolean;
        data?: { availability?: { tourId: string; date: string; remainingSlots: number }[] };
      } = await coverageRes.json();

      const avail = coverageJson.data?.availability ?? [];

      // Группируем по tourId
      const byTour = new Map<string, { dates: string[]; slots: number }>();
      for (const a of avail) {
        if (a.remainingSlots <= 0) continue;
        const existing = byTour.get(a.tourId) ?? { dates: [], slots: 0 };
        existing.dates.push(a.date);
        existing.slots += a.remainingSlots;
        byTour.set(a.tourId, existing);
      }

      const coverage: TourCoverage[] = tourList.map(t => {
        const d = byTour.get(t.id);
        const sortedDates = (d?.dates ?? []).sort();
        return {
          id:         t.id,
          title:      t.title,
          openDays:   d?.dates.length ?? 0,
          totalSlots: d?.slots ?? 0,
          nextDate:   sortedDates[0] ?? null,
        };
      });

      // Сначала туры с 0 открытых дат
      coverage.sort((a, b) => a.openDays - b.openDays);
      setTours(coverage);

      // Если один тур — сразу выбираем его
      if (tourList.length === 1) setFormTour(tourList[0].id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCoverage(); }, [loadCoverage]);

  // ── Отправка ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTour) { setError('Выберите тур'); return; }
    if (!formSlots || formSlots < 1) { setError('Укажите кол-во мест'); return; }
    setError('');
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/operator/calendar/bulk-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId:        Number(formTour),
          startDate:     formStart,
          endDate:       formEnd,
          slots:         formSlots,
          weekdays:      formWeekdays.length > 0 ? formWeekdays : undefined,
          priceOverride: formPrice ? Number(formPrice) : undefined,
          skipExisting,
        }),
      });
      const json: { success: boolean; data?: BulkResult; error?: string; message?: string } =
        await res.json();
      if (json.success && json.data) {
        setResult(json.data);
        void loadCoverage(); // обновляем покрытие
      } else {
        setError(json.error ?? 'Ошибка');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function toggleWeekday(d: number) {
    setFormWeekdays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  }

  function applyPreset(weekdays: number[]) {
    setFormWeekdays(weekdays);
  }

  const noDatesTours = tours.filter(t => t.openDays === 0);
  const hasTours     = tours.length > 0;

  return (
    <div className="space-y-4">

      {/* ── Алерт: туры без открытых дат ─────────────────────────────────── */}
      {!loading && noDatesTours.length > 0 && (
        <div className="ds-card p-3 border-l-4 flex items-start gap-3"
          style={{ borderLeftColor: 'var(--warning)' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
              {noDatesTours.length} тур{noDatesTours.length === 1 ? '' : 'а'} без открытых дат
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Туристы не смогут их найти и забронировать
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {noDatesTours.slice(0, 3).map(t => (
                <button key={t.id}
                  onClick={() => { setFormTour(t.id); setOpenForm(true); }}
                  className="text-[10px] px-1.5 py-0.5 rounded border underline-offset-2 hover:underline"
                  style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                  {t.title}
                </button>
              ))}
              {noDatesTours.length > 3 && (
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  +{noDatesTours.length - 3} ещё
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Список туров с покрытием ──────────────────────────────────────── */}
      <div className="ds-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Открытые даты по турам
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>ближайшие 90 дней</span>
            <button onClick={loadCoverage} disabled={loading}
              className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-10 rounded animate-pulse"
                style={{ background: 'var(--bg-hover)' }} />
            ))}
          </div>
        ) : !hasTours ? (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Нет активных туров. Создайте тур в разделе &laquo;Туры&raquo;.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {tours.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {t.title}
                  </p>
                  {t.nextDate && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Ближайшая дата:{' '}
                      {new Date(t.nextDate + 'T12:00:00').toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'short',
                      })}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {t.openDays > 0 ? (
                    <>
                      <div className="text-xs font-bold" style={{ color: t.openDays >= 10 ? 'var(--success)' : 'var(--warning)' }}>
                        {t.openDays} дней
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {t.totalSlots} мест
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(220,38,38,0.10)', color: 'var(--danger)' }}>
                      нет дат
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setFormTour(t.id); setOpenForm(true); setResult(null); }}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-[var(--accent)]/10 shrink-0"
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                  <Zap className="w-3 h-3 inline-block mr-1" />
                  Открыть
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Форма bulk-открытия ───────────────────────────────────────────── */}
      <div className="ds-card overflow-hidden">
        <button
          onClick={() => { setOpenForm(f => !f); setResult(null); setError(''); }}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Массовое открытие дат
            </span>
          </div>
          {openForm
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
        </button>

        {openForm && (
          <form onSubmit={e => void handleSubmit(e)} className="px-4 pb-4 space-y-4 border-t"
            style={{ borderColor: 'var(--border)' }}>
            <div className="pt-4 space-y-3">

              {/* Тур */}
              <div>
                <label className="ds-label">Тур</label>
                <select
                  value={formTour}
                  onChange={e => setFormTour(e.target.value)}
                  className="ds-input w-full mt-1"
                  required>
                  <option value="">— Выберите тур —</option>
                  {tours.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              {/* Диапазон дат */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">Начало</label>
                  <input type="date" value={formStart} min={today()}
                    onChange={e => setFormStart(e.target.value)}
                    className="ds-input w-full mt-1" required />
                </div>
                <div>
                  <label className="ds-label">Конец</label>
                  <input type="date" value={formEnd} min={formStart}
                    onChange={e => setFormEnd(e.target.value)}
                    className="ds-input w-full mt-1" required />
                </div>
              </div>

              {/* Пресеты */}
              <div>
                <label className="ds-label">Дни недели</label>
                <div className="flex gap-1.5 flex-wrap mt-1.5 mb-2">
                  {PRESETS.map(p => (
                    <button key={p.label} type="button"
                      onClick={() => applyPreset(p.weekdays)}
                      className="text-[10px] px-2 py-1 rounded border transition-colors"
                      style={{
                        borderColor: JSON.stringify(formWeekdays.sort()) === JSON.stringify([...p.weekdays].sort())
                          ? 'var(--accent)' : 'var(--border)',
                        color: JSON.stringify(formWeekdays.sort()) === JSON.stringify([...p.weekdays].sort())
                          ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {WEEKDAY_LABELS.map((label, d) => (
                    <button key={d} type="button"
                      onClick={() => toggleWeekday(d)}
                      className="flex-1 py-1.5 text-[10px] font-bold rounded transition-colors"
                      style={{
                        background: formWeekdays.includes(d) ? 'var(--accent)' : 'var(--bg-hover)',
                        color:      formWeekdays.includes(d) ? '#fff' : 'var(--text-secondary)',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                {formWeekdays.length === 0 && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Не выбрано — откроются все дни диапазона
                  </p>
                )}
              </div>

              {/* Слоты */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">Мест на дату</label>
                  <input type="number" min={1} max={500}
                    value={formSlots}
                    onChange={e => setFormSlots(Number(e.target.value))}
                    className="ds-input w-full mt-1" required />
                </div>
                <div>
                  <label className="ds-label">Цена (если отличается)</label>
                  <input type="number" min={0} placeholder="оставьте пустым"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    className="ds-input w-full mt-1" />
                </div>
              </div>

              {/* Пропускать существующие */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={skipExisting}
                  onChange={e => setSkipExisting(e.target.checked)}
                  className="rounded" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Не перезаписывать уже открытые даты
                </span>
              </label>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--danger)' }}>
                <X className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            {/* Результат */}
            {result && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(63,185,80,0.10)', color: 'var(--success)' }}>
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Открыто {result.opened} дат</span>
                  {result.skipped > 0 && ` · пропущено ${result.skipped}`}
                  {' '}из {result.total} в диапазоне
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff', opacity: submitting ? 0.7 : 1 }}>
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Открываем даты...</>
                : <><Zap className="w-4 h-4" /> Открыть даты</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
