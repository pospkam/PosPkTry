'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Reorder } from 'framer-motion';
import {
  Check, AlertTriangle, Sparkles, Loader,
  Fish, Mountain, PawPrint, Plane,
  Thermometer, Footprints, Wind, Anchor,
  Waves, Flame, Droplets, GripVertical,
  ChevronDown, ChevronUp, MapPin,
  Truck, Users, Trash2, Plus, Star, Phone, X,
} from 'lucide-react';
import type { MapMarker } from '@/components/shared/LeafletMap';
import type { TransportType } from '@/lib/services/trip-recommender';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface SelectItem {
  id: string;
  label: string;
  Icon: React.ElementType;
}

interface DayPlan {
  day: number;
  zone: string;
  title: string;
  activityType: string;
  priceFrom: number;
  priceTo: number;
  coords: [number, number];
  defaultTransport: TransportType;
  type?: string;
  description?: string;
}

interface TripWarning {
  type: string;
  severity: 'critical' | 'important' | 'info';
  message: string;
}

interface Recommendation {
  zones: Array<{ zone: string; score: number; reason: string }>;
  days: DayPlan[];
  warnings?: TripWarning[];
  itinerary: string;
}

interface Partner {
  id: string;
  name: string;
  slug: string;
  rating: number;
  review_count: number;
  hero_image: string | null;
  short_description: string;
  contacts: Array<{ name: string; phone: string; role: string }> | null;
  activity_types: string[];
  has_matching_tours: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLACES: SelectItem[] = [
  { id: 'volcano',    label: 'Вулканы',       Icon: Flame },
  { id: 'hot_spring', label: 'Термальные',    Icon: Thermometer },
  { id: 'geyser',     label: 'Гейзеры',       Icon: Droplets },
  { id: 'sea',        label: 'Побережье',     Icon: Waves },
  { id: 'mountain',   label: 'Хребты',        Icon: Mountain },
  { id: 'river',      label: 'Реки',          Icon: Anchor },
];

const ACTIVITIES: SelectItem[] = [
  { id: 'trekking',   label: 'Треккинг',         Icon: Footprints },
  { id: 'fishing',    label: 'Рыбалка',          Icon: Fish },
  { id: 'helicopter', label: 'Вертолёт',         Icon: Plane },
  { id: 'bears',      label: 'Медведи',          Icon: PawPrint },
  { id: 'snowmobile', label: 'Снегоходы',        Icon: Wind },
  { id: 'boat_trip',  label: 'Морская прогулка', Icon: Anchor },
];

const ZONE_LABELS: Record<string, string> = {
  avachinsky: 'Авачинская — вулканы',
  western:    'Западная — рыбалка',
  eastern:    'Восточная — медведи',
  northern:   'Северная — гейзеры',
};

const ZONE_COLORS: Record<string, string> = {
  avachinsky: 'var(--accent)',
  eastern:    'var(--ocean)',
  northern:   'var(--success)',
  western:    '#a855f7',
};

const TRANSPORT_OPTIONS: Record<TransportType, { label: string; Icon: React.ElementType; priceAdd: number }> = {
  walking:    { label: 'Пешком',    Icon: Footprints, priceAdd: 0 },
  jeep:       { label: 'Джип',      Icon: Truck,      priceAdd: 3000 },
  boat:       { label: 'Катер',     Icon: Anchor,     priceAdd: 8000 },
  helicopter: { label: 'Вертолёт',  Icon: Plane,      priceAdd: 25000 },
};

const TRANSPORT_KEYS = Object.keys(TRANSPORT_OPTIONS) as TransportType[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string { return new Date().toISOString().split('T')[0]; }
function maxDate(): string {
  const d = new Date(); d.setFullYear(d.getFullYear() + 2); return d.toISOString().split('T')[0];
}
function calcDays(from: string, to: string): number | null {
  if (!from || !to) return null;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return diff > 0 ? Math.round(diff / 86400000) : null;
}
function formatDays(n: number): string {
  const nights = n - 1;
  const dLabel = n === 1 ? '1 день' : n < 5 ? `${n} дня` : `${n} дней`;
  const nLabel = nights <= 0 ? '' : nights === 1 ? ' · 1 ночь' : nights < 5 ? ` · ${nights} ночи` : ` · ${nights} ночей`;
  return dLabel + nLabel;
}
function fmt(n: number): string { return n.toLocaleString('ru-RU'); }
function fmtRating(r: number): string { return r.toFixed(1); }

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectGroup({ title, items, selected, onToggle }: {
  title: string; items: SelectItem[]; selected: string[]; onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(({ id, label, Icon }) => {
          const active = selected.includes(id);
          return (
            <button key={id} type="button" onClick={() => onToggle(id)} title={label}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all border ${
                active
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
              }`}>
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TransportSelector({ selected, onChange }: {
  selected: TransportType;
  onChange: (t: TransportType) => void;
}) {
  return (
    <div className="flex gap-1">
      {TRANSPORT_KEYS.map(key => {
        const { label, Icon, priceAdd } = TRANSPORT_OPTIONS[key];
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            title={`${label}${priceAdd > 0 ? ` (+${fmt(priceAdd)} ₽)` : ''}`}
            onClick={() => onChange(key)}
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border text-xs ${
              active
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] bg-[var(--bg-hover)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

function PartnersModal({ activityType, onClose }: {
  activityType: string;
  onClose: () => void;
}) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/planner/partners?activity_type=${encodeURIComponent(activityType)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setPartners(data.data as Partner[]);
        else setError(data.error ?? 'Ошибка');
      })
      .catch(() => setError('Нет соединения'))
      .finally(() => setLoading(false));
  }, [activityType]);

  const activityLabel = ACTIVITIES.find(a => a.id === activityType)?.label
    ?? PLACES.find(p => p.id === activityType)?.label
    ?? activityType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-lg border border-[var(--border)] w-full max-w-md max-h-[80vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Операторы</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{activityLabel}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-[var(--text-muted)]">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Загружаем операторов…</span>
            </div>
          )}
          {!loading && error && (
            <div className="flex items-center gap-2 p-3 bg-[var(--danger)]/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0" />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}
          {!loading && !error && partners.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">Операторы для этого типа тура появятся скоро</p>
            </div>
          )}
          {!loading && partners.map(p => {
            const phone = Array.isArray(p.contacts) ? p.contacts[0]?.phone : null;
            return (
              <div key={p.id}
                className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{p.name}</p>
                  {p.rating > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3 h-3 text-[var(--warning)] fill-current" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">{fmtRating(p.rating)}</span>
                      {p.review_count > 0 && (
                        <span className="text-[10px] text-[var(--text-muted)]">({p.review_count})</span>
                      )}
                    </div>
                  )}
                </div>
                {p.short_description && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{p.short_description}</p>
                )}
                {p.has_matching_tours && (
                  <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)]">
                    Туры для этой активности
                  </span>
                )}
                {phone && (
                  <a href={`tel:${phone}`}
                    className="flex items-center gap-1.5 text-xs text-[var(--ocean)] hover:underline">
                    <Phone className="w-3 h-3" />
                    {phone}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-[var(--border)]">
          <button onClick={onClose} className="w-full ds-btn ds-btn-secondary py-2 text-sm">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TripPlanner() {
  const [places, setPlaces]         = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [arrival, setArrival]       = useState('');
  const [departure, setDeparture]   = useState('');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [days, setDays]             = useState<DayPlan[]>([]);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState('');
  const [showItinerary, setShowItinerary] = useState(false);

  // Level 2 state
  const [transportByDay, setTransportByDay] = useState<Record<number, TransportType>>({});
  const [partnersModal, setPartnersModal]   = useState<{ dayIdx: number; activityType: string } | null>(null);

  // contact form
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactError, setContactError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const togglePlace    = (id: string) => setPlaces(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleActivity = (id: string) => setActivities(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const allInterests = [...new Set([...places, ...activities])];
  const tripDays = useMemo(() => calcDays(arrival, departure), [arrival, departure]);

  // Transport for a given day (defaults to day's AI-suggested transport)
  const getTransport = useCallback((day: DayPlan): TransportType => {
    return transportByDay[day.day] ?? day.defaultTransport;
  }, [transportByDay]);

  const setTransport = useCallback((dayNum: number, t: TransportType) => {
    setTransportByDay(prev => ({ ...prev, [dayNum]: t }));
  }, []);

  // Map markers — unique zones in order, with route polyline
  const mapMarkers = useMemo((): MapMarker[] => {
    if (days.length === 0) return [];
    const seen = new Set<string>();
    const zoneOrder: DayPlan[] = [];
    days.forEach(d => { if (!seen.has(d.zone)) { seen.add(d.zone); zoneOrder.push(d); } });
    const markers: MapMarker[] = zoneOrder.map((d, i) => ({
      coords: d.coords,
      title: `${i + 1}. ${ZONE_LABELS[d.zone] ?? d.zone}`,
      color: i === 0 ? 'red' : 'blue',
    }));
    if (zoneOrder.length >= 2) {
      markers.push({
        coords: zoneOrder[0].coords,
        title: 'Маршрут',
        geometry: { type: 'polyline', coordinates: zoneOrder.map(d => d.coords), color: '#D44A0C', weight: 3 },
      });
    }
    return markers;
  }, [days]);

  const totalFrom = days.reduce((s, d) => s + d.priceFrom + TRANSPORT_OPTIONS[getTransport(d)].priceAdd, 0);
  const totalTo   = days.reduce((s, d) => s + d.priceTo   + TRANSPORT_OPTIONS[getTransport(d)].priceAdd, 0);

  function deleteDay(dayNum: number) {
    setDays(prev => prev.filter(d => d.day !== dayNum));
    setTransportByDay(prev => {
      const next = { ...prev };
      delete next[dayNum];
      return next;
    });
  }

  function addDay() {
    setDays(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const newDayNum = Math.max(...prev.map(d => d.day)) + 1;
      return [...prev, { ...last, day: newDayNum }];
    });
  }

  async function getRecommendation() {
    if (allInterests.length === 0) { setError('Выберите место или активность'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/planner/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: allInterests, arrivalDate: arrival || undefined, departureDate: departure || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setRecommendation(data.data);
        setDays(data.data.days ?? []);
        setTransportByDay({});
        setShowItinerary(false);
      } else {
        setError(data.error || 'Ошибка при получении рекомендации');
      }
    } catch { setError('Нет соединения. Попробуйте снова.'); }
    finally { setLoading(false); }
  }

  async function submitLead() {
    setContactError('');
    const name  = contactName.trim();
    const phone = contactPhone.trim();
    if (name.length < 2)   { setContactError('Введите имя'); return; }
    if (phone.length < 10) { setContactError('Введите телефон'); return; }
    setSubmitting(true);
    const parts: string[] = [];
    if (places.length)     parts.push(`Места: ${places.join(', ')}`);
    if (activities.length) parts.push(`Активности: ${activities.join(', ')}`);
    if (arrival)    parts.push(`Прилёт: ${arrival}`);
    if (departure)  parts.push(`Отъезд: ${departure}`);
    if (tripDays)   parts.push(`Дней: ${tripDays}`);
    if (recommendation?.zones.length) parts.push(`Зоны: ${recommendation.zones.map(z => z.zone).join(', ')}`);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone,
          comment: parts.join(' · ') || undefined,
          source_url: typeof window !== 'undefined' ? window.location.href : '/',
          source_data: {
            source: 'trip_planner',
            interests: allInterests,
            places, activities,
            arrival: arrival || undefined,
            departure: departure || undefined,
            trip_days: tripDays ?? undefined,
            recommendation: recommendation?.zones,
            transport_choices: transportByDay,
          },
        }),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      else setContactError(data.error ?? 'Ошибка');
    } catch { setContactError('Нет соединения'); }
    finally { setSubmitting(false); }
  }

  if (done) {
    return (
      <section id="planner" className="py-12 md:py-20 px-6 md:px-10 max-w-4xl mx-auto">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-10 md:p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--success)]/15 flex items-center justify-center mx-auto mb-6">
            <Check className="w-6 h-6 text-[var(--success)]" />
          </div>
          <h2 className="font-playfair text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3">Готово!</h2>
          <p className="text-[var(--text-secondary)] max-w-sm mx-auto">Ваши предпочтения отправлены. Скоро свяжемся с вами.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="planner" className="py-12 md:py-20 px-6 md:px-10 max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12">

        {/* Форма */}
        <div className="space-y-7">
          <div className="space-y-2">
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
              Идеальное путешествие
            </h2>
            <p className="text-[var(--text-secondary)]">
              Выберите места и активности — подберём маршрут по регионам Камчатки
            </p>
          </div>

          <SelectGroup title="Места" items={PLACES} selected={places} onToggle={togglePlace} />
          <SelectGroup title="Активности" items={ACTIVITIES} selected={activities} onToggle={toggleActivity} />

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Когда приезжаете</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-muted)]">Прилёт</label>
                <input type="date" value={arrival} min={today()} max={maxDate()}
                  onChange={e => { setArrival(e.target.value); if (departure && departure < e.target.value) setDeparture(''); }}
                  className="ds-input w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-muted)]">Отъезд</label>
                <input type="date" value={departure} min={arrival || today()} max={maxDate()}
                  onChange={e => setDeparture(e.target.value)}
                  className="ds-input w-full" />
              </div>
            </div>
            {tripDays != null && tripDays > 0 && (
              <div className="flex items-center gap-2 text-sm text-[var(--success)] font-medium">
                <Check className="w-3.5 h-3.5" />{formatDays(tripDays)}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-[var(--danger)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}

          <button onClick={getRecommendation} disabled={loading || allInterests.length === 0}
            className="w-full ds-btn ds-btn-primary py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {loading
              ? <><Loader className="w-4 h-4 animate-spin" />Генерирую маршрут...</>
              : <><Sparkles className="w-4 h-4" />Получить рекомендацию</>}
          </button>
        </div>

        {/* Результат */}
        {recommendation && (
          <div className="space-y-5">
            {recommendation.warnings && recommendation.warnings.filter(w => w.severity !== 'info').slice(0, 2).map((w, i) => (
              <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${
                w.severity === 'critical'
                  ? 'bg-[var(--danger)]/10 border-[var(--danger)]/30'
                  : 'bg-[var(--warning)]/10 border-[var(--warning)]/30'
              }`}>
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  w.severity === 'critical' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'
                }`} />
                <p className={`text-sm ${w.severity === 'critical' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
                  {w.message}
                </p>
              </div>
            ))}

            {/* Зоны — компактно */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Рекомендованные зоны</p>
              <div className="flex flex-wrap gap-2">
                {recommendation.zones.map(z => (
                  <div key={z.zone} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-hover)] rounded-full border border-[var(--border)]">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ZONE_COLORS[z.zone] ?? 'var(--accent)' }} />
                    <span className="text-xs font-medium text-[var(--text-primary)]">{ZONE_LABELS[z.zone] ?? z.zone}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{z.score}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Маршрут по дням */}
            {days.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Маршрут · {days.length} {days.length === 1 ? 'день' : days.length < 5 ? 'дня' : 'дней'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">перетащите чтобы изменить порядок</p>
                </div>

                <Reorder.Group axis="y" values={days} onReorder={setDays} className="space-y-1.5">
                  {days.map((day, idx) => {
                    const transport = getTransport(day);
                    const { priceAdd, Icon: TransIcon } = TRANSPORT_OPTIONS[transport];
                    return (
                      <Reorder.Item key={day.day} value={day}
                        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg cursor-grab active:cursor-grabbing select-none"
                        style={{ listStyle: 'none' }}>

                        {/* Row 1: info + price */}
                        <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                          <GripVertical className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: ZONE_COLORS[day.zone] ?? 'var(--accent)' }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{day.title}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{ZONE_LABELS[day.zone] ?? day.zone}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-[var(--accent)]">
                              от {fmt(day.priceFrom + priceAdd)} ₽
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              до {fmt(day.priceTo + priceAdd)} ₽
                            </p>
                          </div>
                        </div>

                        {/* Row 2: transport selector + actions */}
                        <div className="flex items-center gap-2 px-3 pb-2.5 pt-0.5">
                          <TransportSelector
                            selected={transport}
                            onChange={t => setTransport(day.day, t)}
                          />
                          {priceAdd > 0 && (
                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
                              <TransIcon className="w-3 h-3" />
                              +{fmt(priceAdd)} ₽
                            </span>
                          )}
                          <div className="flex-1" />
                          <button
                            type="button"
                            title="Операторы для этого дня"
                            onClick={() => setPartnersModal({ dayIdx: idx, activityType: day.activityType })}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--ocean)] hover:border-[var(--ocean)] transition-colors bg-[var(--bg-hover)]"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Удалить день"
                            onClick={() => deleteDay(day.day)}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors bg-[var(--bg-hover)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

                {/* Add day */}
                <button
                  type="button"
                  onClick={addDay}
                  className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[var(--border)] text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить день
                </button>

                {/* Итого */}
                <div className="flex items-center justify-between px-1 mt-2 pt-2 border-t border-[var(--border)]">
                  <span className="text-xs text-[var(--text-secondary)]">Итого за поездку</span>
                  <span className="text-sm font-semibold text-[var(--accent)]">
                    от {fmt(totalFrom)} ₽ — до {fmt(totalTo)} ₽
                  </span>
                </div>
              </div>
            )}

            {/* Карта маршрута */}
            {mapMarkers.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Карта маршрута</p>
                </div>
                <LeafletMap
                  markers={mapMarkers}
                  center={[54.5, 158.5]}
                  zoom={6}
                  height="240px"
                  className="rounded-lg border border-[var(--border)]"
                />
              </div>
            )}

            {/* AI-программа (скрыта по умолчанию) */}
            {recommendation.itinerary && (
              <div>
                <button
                  onClick={() => setShowItinerary(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showItinerary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showItinerary ? 'Скрыть программу' : 'Подробная программа'}
                </button>
                {showItinerary && (
                  <div className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed space-y-1.5 p-3 bg-[var(--bg-hover)] rounded-lg">
                    {recommendation.itinerary.split('\n').filter(l => l.trim()).map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Форма контактов */}
            {!showContact ? (
              <button onClick={() => setShowContact(true)} className="w-full ds-btn ds-btn-primary py-2.5 font-semibold">
                Запросить подробное предложение
              </button>
            ) : (
              <div className="space-y-3 pt-1 border-t border-[var(--border)]">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Контакты</p>
                <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                  placeholder="Ваше имя" className="ds-input w-full text-sm" />
                <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                  placeholder="+7 900 000-00-00" className="ds-input w-full text-sm" />
                {contactError && (
                  <div className="flex items-center gap-2 p-2 bg-[var(--danger)]/10 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                    <p className="text-xs text-[var(--danger)]">{contactError}</p>
                  </div>
                )}
                <button onClick={submitLead} disabled={submitting}
                  className="w-full ds-btn ds-btn-primary py-2.5 font-semibold disabled:opacity-50">
                  {submitting ? 'Отправляем…' : 'Отправить заявку'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Partners modal */}
      {partnersModal && (
        <PartnersModal
          activityType={partnersModal.activityType}
          onClose={() => setPartnersModal(null)}
        />
      )}
    </section>
  );
}
