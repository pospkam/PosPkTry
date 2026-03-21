'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Reorder, useDragControls } from 'framer-motion';
import {
  Check, AlertTriangle, Sparkles, Loader,
  Fish, Mountain, PawPrint, Plane,
  Thermometer, Footprints, Wind, Anchor,
  Waves, Flame, Droplets, GripVertical,
  MapPin, Users, Trash2, Plus, Star, Phone,
  X, ChevronDown, ChevronUp, Truck,
  ArrowRight, ExternalLink, Map as MapIcon, List, Pencil,
  Save, BookmarkCheck, PlaneLanding, PlaneTakeoff, Lock,
} from 'lucide-react';
import type { MapMarker } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

type TransportType = 'walking' | 'jeep' | 'helicopter' | 'boat';

interface SelectItem {
  id: string;
  label: string;
  Icon: React.ElementType;
}

interface DayPlan {
  day: number;
  zone: 'avachinsky' | 'western' | 'eastern' | 'northern';
  title: string;
  activityType: string;
  priceFrom: number;
  priceTo: number;
  coords: [number, number];
  defaultTransport: TransportType;
}

interface Recommendation {
  zones: Array<{ zone: string; score: number; reason: string }>;
  days: DayPlan[];
  itinerary: string;
  warning?: string;
}

interface RoutePoint {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  activity_type: string | null;
  location_type: string | null;
  zone: string | null;
}

interface Partner {
  id: string;
  name: string;
  slug: string;
  rating: number;
  review_count: number;
  short_description: string;
  contacts: Array<{ name: string; phone: string; role: string }> | null;
  has_matching_tours: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLACES: SelectItem[] = [
  { id: 'volcano',    label: 'Вулканы',    Icon: Flame },
  { id: 'hot_spring', label: 'Термальные', Icon: Thermometer },
  { id: 'geyser',     label: 'Гейзеры',    Icon: Droplets },
  { id: 'sea',        label: 'Побережье',  Icon: Waves },
  { id: 'mountain',   label: 'Хребты',     Icon: Mountain },
  { id: 'river',      label: 'Реки',       Icon: Anchor },
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
  western:    'var(--purple)',
};

const ZONE_COORDS: Record<string, [number, number]> = {
  avachinsky: [53.25, 158.75],
  eastern:    [54.80, 160.50],
  northern:   [56.50, 160.00],
  western:    [52.50, 156.50],
};

const ACTIVITY_LABEL: Record<string, string> = {
  trekking:   'Треккинг',
  fishing:    'Рыбалка',
  helicopter: 'Вертолёт',
  bears:      'Медведи',
  snowmobile: 'Снегоходы',
  boat_trip:  'Катер',
  volcano:    'Вулкан',
  hot_spring: 'Термальные',
  geyser:     'Гейзеры',
  sea:        'Побережье',
  mountain:   'Горы',
  river:      'Реки',
};

const INTEREST_PRICE: Record<string, [number, number]> = {
  trekking:   [3000,  8000],
  fishing:    [8000,  20000],
  bears:      [15000, 35000],
  helicopter: [25000, 60000],
  thermal:    [2000,  6000],
  hot_spring: [2000,  5000],
  boat_trip:  [5000,  15000],
  snowmobile: [8000,  18000],
  volcano:    [5000,  12000],
  geyser:     [8000,  20000],
  mountain:   [3000,  9000],
  sea:        [4000,  12000],
  river:      [5000,  15000],
};

const TRANSPORT_OPTIONS: Record<TransportType, { label: string; Icon: React.ElementType; priceAdd: number }> = {
  walking:    { label: 'Пешком',   Icon: Footprints, priceAdd: 0 },
  jeep:       { label: 'Джип',     Icon: Truck,      priceAdd: 3000 },
  boat:       { label: 'Катер',    Icon: Anchor,     priceAdd: 8000 },
  helicopter: { label: 'Вертолёт', Icon: Plane,      priceAdd: 25000 },
};

const ACTIVITY_DEFAULT_TRANSPORT: Record<string, TransportType> = {
  trekking: 'walking', fishing: 'boat', bears: 'helicopter',
  helicopter: 'helicopter', thermal: 'walking', hot_spring: 'walking',
  boat_trip: 'boat', snowmobile: 'jeep', volcano: 'jeep',
  geyser: 'helicopter', mountain: 'walking', sea: 'boat', river: 'boat',
};

const DEFAULT_PRICE: [number, number] = [3000, 10000];

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
function fmt(n: number): string { return n.toLocaleString('ru-RU'); }
function trunc(s: string | null | undefined, len: number): string {
  if (!s) return '';
  return s.length > len ? s.slice(0, len).trimEnd() + '...' : s;
}

function guessZone(lat: number, lng: number): DayPlan['zone'] {
  const entries = Object.entries(ZONE_COORDS) as [string, [number, number]][];
  let best = 'avachinsky';
  let bestDist = Infinity;
  for (const [zone, coords] of entries) {
    const dist = Math.abs(lat - coords[0]) + Math.abs(lng - coords[1]);
    if (dist < bestDist) { bestDist = dist; best = zone; }
  }
  return best as DayPlan['zone'];
}

function routeToDayPlan(route: RoutePoint, dayNum: number): DayPlan {
  const activity = route.activity_type ?? 'trekking';
  const [priceFrom, priceTo] = INTEREST_PRICE[activity] ?? DEFAULT_PRICE;
  return {
    day: dayNum,
    zone: guessZone(route.lat, route.lng),
    title: route.title,
    activityType: activity,
    priceFrom, priceTo,
    coords: [route.lat, route.lng],
    defaultTransport: ACTIVITY_DEFAULT_TRANSPORT[activity] ?? 'walking',
  };
}

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

// Boat only makes sense for coastal/river zones; helicopter not for sea crossings only
const ZONE_TRANSPORTS: Record<string, TransportType[]> = {
  avachinsky: ['walking', 'jeep', 'helicopter'],
  northern:   ['walking', 'jeep', 'helicopter'],
  eastern:    ['walking', 'jeep', 'helicopter', 'boat'],
  western:    ['walking', 'jeep', 'boat'],
};

function TransportSelector({ selected, onChange, zone }: {
  selected: TransportType; onChange: (t: TransportType) => void; zone?: string;
}) {
  const allowed = zone ? (ZONE_TRANSPORTS[zone] ?? Object.keys(TRANSPORT_OPTIONS) as TransportType[]) : Object.keys(TRANSPORT_OPTIONS) as TransportType[];
  // if currently selected transport is not allowed in this zone, use first allowed
  const effective = allowed.includes(selected) ? selected : allowed[0];
  return (
    <div className="flex gap-1">
      {allowed.map(key => {
        const { label, Icon, priceAdd } = TRANSPORT_OPTIONS[key];
        const active = effective === key;
        return (
          <button key={key} type="button"
            title={`${label}${priceAdd > 0 ? ` (+${fmt(priceAdd)} ₽)` : ''}`}
            onClick={() => onChange(key)}
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border text-xs ${
              active
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] bg-[var(--bg-hover)]'
            }`}>
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Day card (DnD-aware) ─────────────────────────────────────────────────────

interface DayCardProps {
  day: DayPlan;
  idx: number;
  isEditing: boolean;
  transport: TransportType;
  flightBadge?: string;
  isLocked?: boolean;
  onToggleEdit: (dayId: number) => void;
  onTransportChange: (dayNum: number, t: TransportType) => void;
  onShowPartners: (activityType: string) => void;
  onDelete: (dayNum: number) => void;
  onShowMap: () => void;
  onRef: (el: HTMLElement | null) => void;
}

function DayCard({
  day, idx, isEditing, transport, flightBadge, isLocked,
  onToggleEdit, onTransportChange, onShowPartners, onDelete, onShowMap, onRef,
}: DayCardProps) {
  const dragControls = useDragControls();
  const { priceAdd, Icon: TransIcon } = TRANSPORT_OPTIONS[transport];
  const FlightIcon = idx === 0 ? PlaneLanding : PlaneTakeoff;

  return (
    <Reorder.Item
      value={day}
      dragControls={dragControls}
      dragListener={false}
      className={`rounded-lg select-none transition-all ${
        isEditing
          ? 'bg-[var(--bg-card)] border-2 border-[var(--accent)] ring-2 ring-[var(--accent)]/20'
          : 'bg-[var(--bg-card)] border border-[var(--border)]'
      }`}
      style={{ listStyle: 'none' }}
    >
      <div ref={onRef}>
        {/* Row 1 — clickable to toggle edit */}
        <div
          className="flex items-center gap-2 px-3 pt-3 pb-1.5 cursor-pointer"
          onClick={() => onToggleEdit(day.day)}
        >
          {isLocked
            ? <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]/40 shrink-0" />
            : <GripVertical
                className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
              />
          }
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 transition-all ${
              isEditing ? 'ring-2 ring-[var(--accent)]/40' : ''
            }`}
            style={{ background: ZONE_COLORS[day.zone] ?? 'var(--accent)' }}
          >
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{day.title}</p>
              {flightBadge && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--ocean)]/15 text-[var(--ocean)] text-[9px] font-bold shrink-0 whitespace-nowrap">
                  <FlightIcon className="w-2.5 h-2.5" />
                  {flightBadge}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              {ZONE_LABELS[day.zone] ?? day.zone}
              {isEditing && (
                <span className="ml-1.5 text-[var(--accent)] font-medium">— редактирование</span>
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-[var(--accent)]">от {fmt(day.priceFrom + priceAdd)} ₽</p>
            <p className="text-[10px] text-[var(--text-muted)]">до {fmt(day.priceTo + priceAdd)} ₽</p>
          </div>
        </div>
        {/* Row 2 — transport + actions */}
        <div className="flex items-center gap-2 px-3 pb-2.5 pt-0.5">
          <TransportSelector selected={transport} onChange={t => onTransportChange(day.day, t)} zone={day.zone} />
          {priceAdd > 0 && (
            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
              <TransIcon className="w-3 h-3" />+{fmt(priceAdd)} ₽
            </span>
          )}
          <div className="flex-1" />
          {isEditing && (
            <button type="button" title="Показать на карте" onClick={onShowMap}
              className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md border border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10 transition-colors">
              <MapIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" title="Операторы" onClick={() => onShowPartners(day.activityType)}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--ocean)] hover:border-[var(--ocean)] transition-colors bg-[var(--bg-hover)]">
            <Users className="w-3.5 h-3.5" />
          </button>
          {!isLocked && (
            <button type="button" title="Удалить день" onClick={() => onDelete(day.day)}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors bg-[var(--bg-hover)]">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}

// Route detail card — shown over the map when a suggestion marker is clicked
function RouteDetailCard({ route, days, editingDayId, onReplace, onAddDay, onClose }: {
  route: RoutePoint;
  days: DayPlan[];
  editingDayId: number | null;
  onReplace: (dayNum: number) => void;
  onAddDay: () => void;
  onClose: () => void;
}) {
  const defaultTarget = editingDayId ?? days[0]?.day ?? 0;
  const [targetDay, setTargetDay] = useState<number>(defaultTarget);
  const actLabel = route.activity_type ? (ACTIVITY_LABEL[route.activity_type] ?? route.activity_type) : null;

  // Auto-update target when editingDayId changes
  useEffect(() => {
    if (editingDayId !== null) setTargetDay(editingDayId);
  }, [editingDayId]);

  const editingIdx = days.findIndex(d => d.day === editingDayId);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-start gap-2 px-3 pt-3 pb-2">
        <MapPin className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{route.title}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {actLabel && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                {actLabel}
              </span>
            )}
            {route.location_type && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--ocean)]/10 text-[var(--ocean)]">
                {route.location_type}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {route.description && (
        <p className="px-3 pb-2 text-xs text-[var(--text-secondary)] leading-relaxed">
          {trunc(route.description, 140)}
        </p>
      )}

      <div className="px-3 pb-3 space-y-2 border-t border-[var(--border)] pt-2">
        {/* In edit mode: direct replace for the editing day */}
        {editingDayId !== null && editingIdx >= 0 && (
          <button
            onClick={() => onReplace(editingDayId)}
            className="w-full ds-btn ds-btn-primary py-2 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Заменить День {editingIdx + 1}
          </button>
        )}

        {/* Select a different day to replace */}
        {days.length > 0 && editingDayId === null && (
          <div className="flex items-center gap-2">
            <select
              value={targetDay}
              onChange={e => setTargetDay(Number(e.target.value))}
              className="ds-input flex-1 text-xs py-1.5"
            >
              {days.map((d, i) => (
                <option key={d.day} value={d.day}>День {i + 1}: {trunc(d.title, 22)}</option>
              ))}
            </select>
            <button
              onClick={() => onReplace(targetDay)}
              className="ds-btn ds-btn-primary px-3 py-1.5 text-xs font-medium flex items-center gap-1 shrink-0"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Заменить
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={onAddDay}
            className="ds-btn ds-btn-secondary flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Добавить в план
          </button>
          <a href={`/routes/${route.id}`} target="_blank" rel="noopener noreferrer"
            className="ds-btn ds-btn-secondary py-1.5 px-2 text-xs flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

// Partners mini-modal
function PartnersModal({ activityType, onClose }: {
  activityType: string; onClose: () => void;
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

  const label = [...ACTIVITIES, ...PLACES].find(a => a.id === activityType)?.label ?? activityType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-lg border border-[var(--border)] w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Операторы</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-[var(--text-muted)]">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Загружаем операторов...</span>
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-[var(--danger)] p-3">{error}</p>
          )}
          {!loading && !error && partners.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">Операторы появятся скоро</p>
            </div>
          )}
          {!loading && partners.map(p => {
            const phone = Array.isArray(p.contacts) ? p.contacts[0]?.phone : null;
            return (
              <div key={p.id} className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{p.name}</p>
                  {Number(p.rating) > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3 h-3 text-[var(--warning)] fill-current" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">{Number(p.rating).toFixed(1)}</span>
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
                  <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-xs text-[var(--ocean)] hover:underline">
                    <Phone className="w-3 h-3" />{phone}
                  </a>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <button onClick={onClose} className="w-full ds-btn ds-btn-secondary py-2 text-sm">Закрыть</button>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Tab Switcher ─────────────────────────────────────────────────────

type MobileTab = 'plan' | 'map';

function MobileTabBar({ active, onChange, editingDay }: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  editingDay: { idx: number; title: string } | null;
}) {
  return (
    <div className="lg:hidden border-b border-[var(--border)] bg-[var(--bg-primary)]">
      {editingDay && (
        <div className="px-4 py-2 bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          <p className="text-xs text-[var(--accent)] font-medium truncate">
            Замена для Дня {editingDay.idx + 1}: {editingDay.title}
          </p>
        </div>
      )}
      <div className="flex">
        <button
          onClick={() => onChange('plan')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            active === 'plan'
              ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <List className="w-4 h-4" />
          План
        </button>
        <button
          onClick={() => onChange('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            active === 'map'
              ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          Карта
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlannerClient({ initialUserId }: { initialUserId?: string | null }) {
  // Interest + date
  const [places, setPlaces]         = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [arrival, setArrival]       = useState('');
  const [departure, setDeparture]   = useState('');
  const [flightArrival, setFlightArrival]     = useState('');
  const [flightDeparture, setFlightDeparture] = useState('');
  const [flightArrivalTime, setFlightArrivalTime]       = useState('');
  const [flightDepartureTime, setFlightDepartureTime]   = useState('');
  const [needsAirportTransfer, setNeedsAirportTransfer] = useState(false);

  // Trip persistence
  const [tripId, setTripId]         = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Plan
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [days, setDays]   = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [showItinerary, setShowItinerary] = useState(false);

  // Level 2
  const [transportByDay, setTransportByDay] = useState<Record<number, TransportType>>({});
  const [partnersModal, setPartnersModal]   = useState<{ activityType: string } | null>(null);

  // Background route markers
  const [bgRoutes, setBgRoutes] = useState<RoutePoint[]>([]);
  const [bgLoading, setBgLoading] = useState(false);

  // Selected route on map (clicked suggestion)
  const [selectedRoute, setSelectedRoute] = useState<RoutePoint | null>(null);

  // Edit mode: which day is being edited (null = overview)
  const [editingDayId, setEditingDayId] = useState<number | null>(null);

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('plan');

  // Lead form
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactError, setContactError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Refs for scrolling to day card
  const dayRefs = useRef<Map<number, HTMLElement>>(new Map());

  const allInterests = [...new Set([...places, ...activities])];
  const tripDays = useMemo(() => calcDays(arrival, departure), [arrival, departure]);

  // Editing day info for banner
  const editingDayInfo = useMemo(() => {
    if (editingDayId === null) return null;
    const idx = days.findIndex(d => d.day === editingDayId);
    if (idx < 0) return null;
    return { idx, title: days[idx].title };
  }, [editingDayId, days]);

  // Transport helpers
  const getTransport = useCallback((day: DayPlan): TransportType =>
    transportByDay[day.day] ?? day.defaultTransport, [transportByDay]);
  const setTransport = useCallback((dayNum: number, t: TransportType) =>
    setTransportByDay(prev => ({ ...prev, [dayNum]: t })), []);

  // Toggle edit mode on a day
  const toggleEditDay = useCallback((dayId: number) => {
    setEditingDayId(prev => prev === dayId ? null : dayId);
    setSelectedRoute(null);
  }, []);

  // Save / update trip in DB (requires auth)
  const saveTrip = useCallback(async () => {
    if (!initialUserId) {
      window.location.href = `/auth/login?from=/planner`;
      return;
    }
    if (days.length === 0) return;

    setSaveStatus('saving');
    try {
      const payload = {
        title: recommendation ? `Маршрут ${arrival || 'Камчатка'}` : 'Мой маршрут',
        arrivalDate: arrival || null,
        departureDate: departure || null,
        places,
        activities,
        days,
        transportByDay,
        flightArrival: flightArrival || null,
        flightDeparture: flightDeparture || null,
        flightArrivalTime: flightArrivalTime || null,
        flightDepartureTime: flightDepartureTime || null,
        needsAirportTransfer,
      };

      let res: Response;
      if (tripId) {
        res = await fetch(`/api/trips/${tripId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data: { success: boolean; data?: { id: string } } = await res.json();
      if (!data.success) throw new Error('save failed');

      if (!tripId && data.data?.id) setTripId(data.data.id);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [initialUserId, days, arrival, departure, places, activities, transportByDay, flightArrival, flightDeparture, flightArrivalTime, flightDepartureTime, needsAirportTransfer, recommendation, tripId]);

  // Map: plan markers (numbered) + polyline + background route dots (colored by zone)
  const mapMarkers = useMemo((): MapMarker[] => {
    const result: MapMarker[] = [];

    // Zone → Yandex preset color mapping for suggestion dots
    const ZONE_DOT_PRESET: Record<string, string> = {
      avachinsky: 'islands#orangeDotIcon',
      eastern:    'islands#blueDotIcon',
      northern:   'islands#greenDotIcon',
      western:    'islands#violetDotIcon',
    };

    // Background route dots — colored by zone, bright in edit mode
    const editingDay = editingDayId !== null ? days.find(d => d.day === editingDayId) : null;

    bgRoutes.forEach(r => {
      const routeZone = r.zone ?? guessZone(r.lat, r.lng);
      const isNearEditZone = editingDay && routeZone === editingDay.zone;

      // In edit mode: matching zone bright, others gray
      // In overview: colored by zone
      let preset: string;
      if (editingDay) {
        preset = isNearEditZone
          ? (ZONE_DOT_PRESET[routeZone] ?? 'islands#orangeDotIcon')
          : 'islands#grayDotIcon';
      } else {
        preset = ZONE_DOT_PRESET[routeZone] ?? 'islands#grayDotIcon';
      }

      result.push({
        id: r.id,
        coords: [r.lat, r.lng],
        title: r.title,
        description: trunc(r.description, 80) || undefined,
        preset,
        suppressBalloon: true,
      });
    });

    if (days.length === 0) return result;

    // Unique zones for polyline
    const seen = new Set<string>();
    const zoneOrder: DayPlan[] = [];
    days.forEach(d => { if (!seen.has(d.zone)) { seen.add(d.zone); zoneOrder.push(d); } });

    // Plan day markers (numbered pins)
    days.forEach((d, i) => {
      const isEditing = d.day === editingDayId;
      result.push({
        id: `day_${d.day}`,
        coords: d.coords,
        title: `${i + 1}. ${d.title}`,
        description: ZONE_LABELS[d.zone] ?? d.zone,
        color: isEditing ? 'orange' : i === 0 ? 'red' : 'blue',
        suppressBalloon: true,
      });
    });

    // Polyline
    if (zoneOrder.length >= 2) {
      result.push({
        id: 'route_line',
        coords: zoneOrder[0].coords,
        title: 'Маршрут',
        geometry: { type: 'polyline', coordinates: zoneOrder.map(d => d.coords), color: 'orange', weight: 3 },
      });
    }

    return result;
  }, [days, bgRoutes, editingDayId]);

  // Handle map marker click
  const handleMarkerClick = useCallback((id: string) => {
    // Click on day marker → scroll to day in panel + toggle edit
    if (id.startsWith('day_')) {
      const dayNum = Number(id.replace('day_', ''));
      if (!isNaN(dayNum)) {
        toggleEditDay(dayNum);
        // Scroll to day card
        const el = dayRefs.current.get(dayNum);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // On mobile, switch to plan tab
        setMobileTab('plan');
      }
      return;
    }
    if (id === 'route_line') return;
    // Click on suggestion route
    const route = bgRoutes.find(r => r.id === id);
    if (route) setSelectedRoute(route);
  }, [bgRoutes, toggleEditDay]);

  // Totals
  const totalFrom = days.reduce((s, d) => s + d.priceFrom + TRANSPORT_OPTIONS[getTransport(d)].priceAdd, 0);
  const totalTo   = days.reduce((s, d) => s + d.priceTo   + TRANSPORT_OPTIONS[getTransport(d)].priceAdd, 0);

  // Fetch background routes whenever interests change; defaults on mount
  useEffect(() => {
    const types = allInterests.length > 0
      ? [...new Set(allInterests)]
      : ['trekking', 'volcano', 'fishing'];
    let cancelled = false;

    setBgLoading(true);

    const fetches = types.map(actType =>
      fetch(`/api/routes?activity_type=${encodeURIComponent(actType)}&hasCoords=true&limit=30`)
        .then(r => r.json())
        .then(data => (data.success && Array.isArray(data.data) ? data.data as RoutePoint[] : [] as RoutePoint[]))
        .catch(() => [] as RoutePoint[])
    );

    Promise.all(fetches).then(results => {
      if (cancelled) return;
      const seen = new Set<string>();
      const deduped: RoutePoint[] = [];
      for (const batch of results) {
        for (const route of batch) {
          if (!seen.has(route.id)) { seen.add(route.id); deduped.push(route); }
        }
      }
      setBgRoutes(deduped);
      setBgLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.join(','), activities.join(',')])

  // Clear edit mode when days change (e.g. day deleted)
  useEffect(() => {
    if (editingDayId !== null && !days.find(d => d.day === editingDayId)) {
      setEditingDayId(null);
    }
  }, [days, editingDayId]);

  function deleteDay(dayNum: number) {
    setDays(prev => prev.filter(d => d.day !== dayNum));
    setTransportByDay(prev => { const n = { ...prev }; delete n[dayNum]; return n; });
    if (editingDayId === dayNum) setEditingDayId(null);
  }

  function addDay() {
    if (days.length === 0) return;
    const last = days[days.length - 1];
    const newNum = Math.max(...days.map(d => d.day)) + 1;
    setDays(prev => [...prev, { ...last, day: newNum }]);
    setEditingDayId(newNum);
    setMobileTab('map');
  }

  function replaceDay(dayNum: number, route: RoutePoint) {
    setDays(prev => prev.map(d => d.day === dayNum ? routeToDayPlan(route, dayNum) : d));
    setTransportByDay(prev => { const n = { ...prev }; delete n[dayNum]; return n; });
    setSelectedRoute(null);
    setEditingDayId(null);
  }

  function addRouteAsDay(route: RoutePoint) {
    setDays(prev => {
      const newNum = prev.length > 0 ? Math.max(...prev.map(d => d.day)) + 1 : 1;
      return [...prev, routeToDayPlan(route, newNum)];
    });
    setSelectedRoute(null);
  }

  async function getRecommendation() {
    if (allInterests.length === 0) { setError('Выберите место или активность'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/planner/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: allInterests,
          arrivalDate: arrival || undefined,
          departureDate: departure || undefined,
          flightArrivalTime: flightArrivalTime || undefined,
          needsAirportTransfer: needsAirportTransfer || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRecommendation(data.data);
        setDays(data.data.days ?? []);
        setTransportByDay({});
        setSelectedRoute(null);
        setEditingDayId(null);
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
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone,
          source_url: typeof window !== 'undefined' ? window.location.href : '/planner',
          source_data: {
            source: 'planner_page',
            interests: allInterests,
            arrival: arrival || undefined,
            departure: departure || undefined,
            flight_arrival: flightArrival || undefined,
            flight_departure: flightDeparture || undefined,
            flight_arrival_time: flightArrivalTime || undefined,
            flight_departure_time: flightDepartureTime || undefined,
            needs_airport_transfer: needsAirportTransfer || undefined,
            trip_days: tripDays ?? undefined,
            recommendation: recommendation?.zones,
            transport_choices: transportByDay,
            day_plan: days.map((d, i) => ({ day: i + 1, title: d.title, zone: d.zone, activity: d.activityType })),
          },
        }),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      else setContactError(data.error ?? 'Ошибка');
    } catch { setContactError('Нет соединения'); }
    finally { setSubmitting(false); }
  }

  // ── Plan panel content ─────────────────────────────────────────────────────

  const planPanel = (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-playfair text-2xl font-bold text-[var(--text-primary)]">
          Маршрут по Камчатке
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Выберите интересы — AI подберёт программу по дням
        </p>
      </div>

      {/* Interests */}
      <SelectGroup title="Места" items={PLACES} selected={places}
        onToggle={id => setPlaces(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} />
      <SelectGroup title="Активности" items={ACTIVITIES} selected={activities}
        onToggle={id => setActivities(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} />

      {/* Dates */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Даты</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Прилёт</label>
            <input type="date" value={arrival} min={today()} max={maxDate()}
              onChange={e => { setArrival(e.target.value); if (departure && departure < e.target.value) setDeparture(''); }}
              className="ds-input w-full text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Отъезд</label>
            <input type="date" value={departure} min={arrival || today()} max={maxDate()}
              onChange={e => setDeparture(e.target.value)}
              className="ds-input w-full text-sm" />
          </div>
        </div>
        {tripDays != null && tripDays > 0 && (
          <p className="text-xs text-[var(--success)] font-medium flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            {tripDays} {tripDays === 1 ? 'день' : tripDays < 5 ? 'дня' : 'дней'}
          </p>
        )}
        {/* Flight numbers */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <PlaneLanding className="w-3 h-3" />
              Рейс прилёта
            </label>
            <input type="text" value={flightArrival}
              onChange={e => setFlightArrival(e.target.value.toUpperCase())}
              placeholder="SU 1234" maxLength={20}
              className="ds-input w-full text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <PlaneTakeoff className="w-3 h-3" />
              Рейс вылета
            </label>
            <input type="text" value={flightDeparture}
              onChange={e => setFlightDeparture(e.target.value.toUpperCase())}
              placeholder="S7 456" maxLength={20}
              className="ds-input w-full text-sm" />
          </div>
        </div>
        {/* Flight times */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Время прилёта</label>
            <input type="time" value={flightArrivalTime}
              onChange={e => setFlightArrivalTime(e.target.value)}
              className="ds-input w-full text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Время вылета</label>
            <input type="time" value={flightDepartureTime}
              onChange={e => setFlightDepartureTime(e.target.value)}
              className="ds-input w-full text-sm" />
          </div>
        </div>
        {/* Airport transfer */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={needsAirportTransfer}
            onChange={e => setNeedsAirportTransfer(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--accent)]" />
          <span className="text-xs text-[var(--text-muted)]">
            Нужна встреча в аэропорту и трансфер (~2 500 ₽/сторона)
          </span>
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      <button onClick={getRecommendation} disabled={loading || allInterests.length === 0}
        className="w-full ds-btn ds-btn-primary py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        {loading
          ? <><Loader className="w-4 h-4 animate-spin" />Генерирую маршрут...</>
          : <><Sparkles className="w-4 h-4" />Получить рекомендацию</>}
      </button>

      {/* Results */}
      {recommendation && (
        <>
          {recommendation.warning && (
            <div className="flex items-start gap-2 p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--warning)]">{recommendation.warning}</p>
            </div>
          )}

          {/* Zones */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Зоны</p>
            <div className="flex flex-wrap gap-1.5">
              {recommendation.zones.map(z => (
                <div key={z.zone} className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-hover)] rounded-full border border-[var(--border)]">
                  <div className="w-2 h-2 rounded-full" style={{ background: ZONE_COLORS[z.zone] ?? 'var(--accent)' }} />
                  <span className="text-xs font-medium text-[var(--text-primary)]">{ZONE_LABELS[z.zone] ?? z.zone}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{z.score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Days */}
          {days.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  {days.length} {days.length === 1 ? 'день' : days.length < 5 ? 'дня' : 'дней'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {editingDayId !== null ? 'кликните карту для замены' : 'кликните день для редактирования'}
                </p>
              </div>

              <Reorder.Group axis="y" values={days} onReorder={setDays} className="space-y-1.5">
                {days.map((day, idx) => (
                  <DayCard
                    key={day.day}
                    day={day}
                    idx={idx}
                    isEditing={day.day === editingDayId}
                    transport={getTransport(day)}
                    flightBadge={
                      days.length >= 3 && idx === 0
                        ? (flightArrival || 'Прилёт')
                        : days.length >= 3 && idx === days.length - 1
                          ? (flightDeparture || 'Вылет')
                          : undefined
                    }
                    isLocked={days.length >= 3 && (idx === 0 || idx === days.length - 1)}
                    onToggleEdit={toggleEditDay}
                    onTransportChange={setTransport}
                    onShowPartners={(at) => setPartnersModal({ activityType: at })}
                    onDelete={deleteDay}
                    onShowMap={() => setMobileTab('map')}
                    onRef={(el) => {
                      if (el) dayRefs.current.set(day.day, el as HTMLElement);
                      else dayRefs.current.delete(day.day);
                    }}
                  />
                ))}
              </Reorder.Group>

              {/* Add day */}
              <button type="button" onClick={addDay}
                className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[var(--border)] text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Добавить день
              </button>

              {/* Total */}
              <div className="flex items-center justify-between px-1 mt-2 pt-2 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--text-secondary)]">Итого за поездку</span>
                <span className="text-sm font-semibold text-[var(--accent)]">
                  от {fmt(totalFrom)} ₽ — до {fmt(totalTo)} ₽
                </span>
              </div>
            </div>
          )}

          {/* AI itinerary */}
          {recommendation.itinerary && (
            <div>
              <button onClick={() => setShowItinerary(v => !v)}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
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

          {/* Save trip */}
          {days.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={saveTrip}
                disabled={saveStatus === 'saving'}
                className={`flex-1 ds-btn py-2.5 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  saveStatus === 'saved'
                    ? 'bg-[var(--success)] border-[var(--success)] text-white'
                    : saveStatus === 'error'
                    ? 'bg-[var(--danger)] border-[var(--danger)] text-white'
                    : 'ds-btn-secondary'
                }`}
              >
                {saveStatus === 'saving' && <Loader className="w-4 h-4 animate-spin" />}
                {saveStatus === 'saved' && <BookmarkCheck className="w-4 h-4" />}
                {saveStatus === 'error' && <AlertTriangle className="w-4 h-4" />}
                {saveStatus === 'idle' && <Save className="w-4 h-4" />}
                {saveStatus === 'saving' ? 'Сохраняем...'
                  : saveStatus === 'saved' ? 'Сохранено'
                  : saveStatus === 'error' ? 'Ошибка'
                  : !initialUserId ? 'Войти и сохранить'
                  : tripId ? 'Обновить маршрут'
                  : 'Сохранить маршрут'}
              </button>
              {tripId && (
                <a
                  href={`/hub/tourist/trips/${tripId}`}
                  className="ds-btn ds-btn-secondary px-3 py-2.5 flex items-center justify-center"
                  title="Открыть сохранённый маршрут"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Contact form */}
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
                {submitting ? 'Отправляем...' : 'Отправить заявку'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Map panel content ──────────────────────────────────────────────────────

  const mapPanel = (
    <div className="relative w-full h-full">
      <LeafletMap
        markers={mapMarkers}
        center={[54.5, 158.5]}
        zoom={6}
        height="100%"
        className="rounded-none border-0"
        onMarkerClick={handleMarkerClick}
      />

      {/* Hint / Loading */}
      {bgLoading && bgRoutes.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-2 text-xs text-[var(--text-muted)] flex items-center gap-2 shadow-sm">
            <Loader className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
            Загружаем маршруты...
          </div>
        </div>
      )}

      {/* Edit mode banner on map */}
      {editingDayInfo && (
        <div className="absolute top-4 left-4 right-4 lg:right-auto lg:max-w-sm pointer-events-auto z-10">
          <div className="bg-[var(--bg-card)] border border-[var(--accent)] rounded-lg px-4 py-2.5 shadow-lg flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: 'var(--accent)' }}>
              {editingDayInfo.idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                Замена: {editingDayInfo.title}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Кликните любую точку на карте
              </p>
            </div>
            <button onClick={() => setEditingDayId(null)}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Background routes count badge (when not in edit mode) */}
      {bgRoutes.length > 0 && !editingDayInfo && (
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] flex items-center gap-2 shadow-sm">
            <div className="flex gap-0.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--ocean)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--purple)' }} />
            </div>
            {bgRoutes.length} маршрутов по зонам
          </div>
        </div>
      )}

      {/* Route detail card overlay */}
      {selectedRoute && (
        <div className="absolute bottom-4 left-4 right-4 lg:right-auto lg:w-80 z-10">
          <RouteDetailCard
            route={selectedRoute}
            days={days}
            editingDayId={editingDayId}
            onReplace={dayNum => replaceDay(dayNum, selectedRoute)}
            onAddDay={() => addRouteAsDay(selectedRoute)}
            onClose={() => setSelectedRoute(null)}
          />
        </div>
      )}
    </div>
  );

  // ── Layout ──────────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-10 md:p-16 text-center max-w-md mx-4">
          <div className="w-12 h-12 rounded-full bg-[var(--success)]/15 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-[var(--success)]" />
          </div>
          <h2 className="font-playfair text-2xl font-bold text-[var(--text-primary)] mb-2">Готово!</h2>
          <p className="text-sm text-[var(--text-secondary)]">Ваши предпочтения отправлены. Скоро свяжемся с вами.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)', minHeight: 500 }}>

      {/* Mobile tab bar */}
      <MobileTabBar
        active={mobileTab}
        onChange={setMobileTab}
        editingDay={editingDayInfo}
      />

      {/* Desktop: side-by-side. Mobile: tab-switched */}
      <div className="flex flex-1 min-h-0">

        {/* Map (left on desktop, shown when map tab active on mobile) */}
        <div className={`flex-1 min-h-0 ${mobileTab === 'map' ? 'block' : 'hidden'} lg:block`}>
          {mapPanel}
        </div>

        {/* Plan panel (right on desktop, shown when plan tab active on mobile) */}
        <div className={`w-full lg:w-[400px] shrink-0 overflow-y-auto lg:border-l border-[var(--border)] bg-[var(--bg-primary)] ${
          mobileTab === 'plan' ? 'block' : 'hidden'
        } lg:block`}>
          {planPanel}
        </div>
      </div>

      {/* Partners modal */}
      {partnersModal && (
        <PartnersModal activityType={partnersModal.activityType} onClose={() => setPartnersModal(null)} />
      )}
    </div>
  );
}
