'use client';

import { useState, useMemo } from 'react';
import {
  Check, AlertTriangle, Sparkles, Loader,
  Fish, Mountain, PawPrint, Plane,
  Thermometer, Footprints, Wind, Anchor,
  Waves, Flame, Droplets,
} from 'lucide-react';

interface SelectItem {
  id: string;
  label: string;
  Icon: React.ElementType;
}

const PLACES: SelectItem[] = [
  { id: 'volcano',    label: 'Вулканы',          Icon: Flame },
  { id: 'hot_spring', label: 'Термальные',        Icon: Thermometer },
  { id: 'geyser',     label: 'Гейзеры',           Icon: Droplets },
  { id: 'sea',        label: 'Побережье',         Icon: Waves },
  { id: 'mountain',   label: 'Горные хребты',     Icon: Mountain },
  { id: 'river',      label: 'Реки',              Icon: Anchor },
];

const ACTIVITIES: SelectItem[] = [
  { id: 'trekking',   label: 'Треккинг',          Icon: Footprints },
  { id: 'fishing',    label: 'Рыбалка',           Icon: Fish },
  { id: 'helicopter', label: 'Вертолёт',          Icon: Plane },
  { id: 'bears',      label: 'Медведи',           Icon: PawPrint },
  { id: 'snowmobile', label: 'Снегоходы',         Icon: Wind },
  { id: 'boat_trip',  label: 'Морская прогулка',  Icon: Anchor },
];

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
  const nLabel = nights === 0 ? '' : nights === 1 ? ' · 1 ночь' : nights < 5 ? ` · ${nights} ночи` : ` · ${nights} ночей`;
  return dLabel + nLabel;
}

interface Recommendation {
  zones: Array<{ zone: string; score: number; reason: string }>;
  itinerary: string;
  warning?: string;
}

const ZONE_LABELS: Record<string, string> = {
  avachinsky: 'Авачинская зона — вулканы, парк',
  western:    'Западная зона — рыбалка, реки',
  eastern:    'Восточная зона — медведи, заповедник',
  northern:   'Северная зона — гейзеры, дикая природа',
};

function SelectGroup({ title, items, selected, onToggle }: {
  title: string;
  items: SelectItem[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(({ id, label, Icon }) => {
          const active = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                active
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TripPlanner() {
  const [places, setPlaces]       = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [arrival, setArrival]     = useState('');
  const [departure, setDeparture] = useState('');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const togglePlace    = (id: string) => setPlaces(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleActivity = (id: string) => setActivities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const allInterests = [...new Set([...places, ...activities])];
  const tripDays = useMemo(() => calcDays(arrival, departure), [arrival, departure]);

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
      if (data.success) setRecommendation(data.data);
      else setError(data.error || 'Ошибка при получении рекомендации');
    } catch { setError('Нет соединения. Попробуйте снова.'); }
    finally { setLoading(false); }
  }

  async function submitLead() {
    const parts: string[] = [];
    if (places.length)    parts.push(`Места: ${places.join(', ')}`);
    if (activities.length) parts.push(`Активности: ${activities.join(', ')}`);
    if (arrival)   parts.push(`Прилёт: ${arrival}`);
    if (departure) parts.push(`Отъезд: ${departure}`);
    if (tripDays)  parts.push(`Дней: ${tripDays}`);
    if (recommendation?.zones.length) parts.push(`Зоны: ${recommendation.zones.map(z => z.zone).join(', ')}`);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Турист', phone: '+7',
          comment: parts.join(' · ') || undefined,
          source_url: typeof window !== 'undefined' ? window.location.href : '/',
          source_data: { places, activities, arrival, departure, trip_days: tripDays, recommendation: recommendation?.zones, source: 'ai_trip_planner' },
        }),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      else setError(data.error ?? 'Ошибка');
    } catch { setError('Нет соединения'); }
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
          <div className="ds-card p-6 space-y-5">
            {recommendation.warning && (
              <div className="flex items-start gap-2 p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--warning)]">{recommendation.warning}</p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Рекомендованные зоны</p>
              <div className="space-y-2">
                {recommendation.zones.map((z, i) => (
                  <div key={z.zone} className="p-3 bg-[var(--bg-hover)] rounded-lg border-l-4 border-[var(--accent)]">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-[var(--text-primary)]">
                        {i + 1}. {ZONE_LABELS[z.zone] ?? z.zone}
                      </p>
                      <span className="text-xs font-bold bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded">
                        {z.score}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{z.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Программа</p>
              <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-1.5">
                {recommendation.itinerary.split('\n').filter(l => l.trim()).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            <button onClick={submitLead} className="w-full ds-btn ds-btn-primary py-2.5 font-semibold">
              Запросить подробное предложение
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
