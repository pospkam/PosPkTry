'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Reorder } from 'framer-motion';
import {
  Check, AlertTriangle, Sparkles, Loader,
  Fish, Mountain, PawPrint, Plane,
  Thermometer, Footprints, Wind, Anchor,
  Waves, Flame, Droplets, GripVertical,
  ChevronDown, ChevronUp, MapPin,
} from 'lucide-react';
import type { MapMarker } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

interface SelectItem {
  id: string;
  label: string;
  Icon: React.ElementType;
}

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

interface DayPlan {
  day: number;
  zone: string;
  title: string;
  activityType: string;
  priceFrom: number;
  priceTo: number;
  coords: [number, number];
}

interface Recommendation {
  zones: Array<{ zone: string; score: number; reason: string }>;
  days: DayPlan[];
  itinerary: string;
  warning?: string;
}

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

  const totalFrom = days.reduce((s, d) => s + d.priceFrom, 0);
  const totalTo   = days.reduce((s, d) => s + d.priceTo, 0);

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
            {recommendation.warning && (
              <div className="flex items-start gap-2 p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--warning)]">{recommendation.warning}</p>
              </div>
            )}

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
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Маршрут · {days.length} {days.length === 1 ? 'день' : days.length < 5 ? 'дня' : 'дней'}
                </p>
                <Reorder.Group axis="y" values={days} onReorder={setDays} className="space-y-1.5">
                  {days.map((day, idx) => (
                    <Reorder.Item key={day.day} value={day}
                      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg cursor-grab active:cursor-grabbing select-none"
                      style={{ listStyle: 'none' }}>
                      <div className="flex items-center gap-2 p-3">
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
                          <p className="text-xs font-semibold text-[var(--accent)]">от {fmt(day.priceFrom)} ₽</p>
                          <p className="text-[10px] text-[var(--text-muted)]">до {fmt(day.priceTo)} ₽</p>
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>

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
    </section>
  );
}
