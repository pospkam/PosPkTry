'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Sun, Moon, User, X, ArrowRight, MapPin } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import dynamic from 'next/dynamic';
import Logo from '@/components/shared/Logo';
import BottomNav from '@/components/shared/BottomNav';
import { AssistantButton } from '@/components/shared/AssistantButton';
import { MarkerType, type MapMarkerGeometry } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

// ГДЕ — типы локаций с цветами и иконками на карте
const LOCATION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  volcano:      { label: 'Вулканы',       color: 'orange' },
  geyser:       { label: 'Гейзеры',       color: 'green' },
  hot_spring:   { label: 'Источники',     color: 'red' },
  lake:         { label: 'Озёра',         color: 'lightBlue' },
  mountain:     { label: 'Горы',          color: 'darkBlue' },
  river:        { label: 'Реки',          color: 'teal' },
  bay:          { label: 'Океан',         color: 'darkCyan' },
  waterfall:    { label: 'Водопады',      color: 'blue' },
  cape:         { label: 'Мысы',          color: 'gray' },
  island:       { label: 'Острова',       color: 'purple' },
  rock:         { label: 'Скалы',         color: 'brown' },
  forest:       { label: 'Леса и парки',  color: 'darkGreen' },
  beach:        { label: 'Пляжи',         color: 'orange' },
  viewpoint:    { label: 'Смотровые',     color: 'cyan' },
  settlement:   { label: 'Сёла',          color: 'gray' },
  museum:       { label: 'Музеи',         color: 'purple' },
  historical:   { label: 'История',       color: 'brown' },
  other:        { label: 'Прочее',        color: 'gray' },
};

// Основные фильтры для UI (без мусорных типов)
// id начинающийся с 'activity:' — фильтр по activity_type
const LOCATION_FILTERS = [
  { id: 'all',                  label: 'Все' },
  { id: 'activity:esoteric',    label: 'Места силы' },
  { id: 'volcano',              label: 'Вулканы' },
  { id: 'hot_spring',           label: 'Источники' },
  { id: 'bay',                  label: 'Океан' },
  { id: 'lake',                 label: 'Озёра' },
  { id: 'mountain',             label: 'Горы' },
  { id: 'river',                label: 'Реки' },
  { id: 'geyser',               label: 'Гейзеры' },
  { id: 'waterfall',            label: 'Водопады' },
  { id: 'viewpoint',            label: 'Смотровые' },
  { id: 'rock',                 label: 'Скалы' },
  { id: 'island',               label: 'Острова' },
  { id: 'beach',                label: 'Пляжи' },
  { id: 'forest',               label: 'Леса и парки' },
  { id: 'museum',               label: 'Музеи' },
  { id: 'historical',           label: 'История' },
];

interface RoutePoint {
  id: string;
  title: string;
  locationType: string | null;
  activityType: string | null;
  lat: number;
  lng: number;
  description: string;
  volcanoStatus?: string | null;
  geometry?: MapMarkerGeometry | null;
}

const VOLCANO_STATUS_COLOR: Record<string, string> = {
  erupting:          'red',
  active:            'orange',
  potentially_active: 'yellow',
  dormant:           'gray',
  unknown:           'gray',
};

export default function MapPageClient() {
  const { isDark, toggleTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState('all');
  const [allRoutes, setAllRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRoute = selectedId ? allRoutes.find(r => r.id === selectedId) ?? null : null;
  const handleMarkerClick = useCallback((id: string) => setSelectedId(id), []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/routes?hasCoords=true&limit=900&sort=title&category=geo');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;
        const points: RoutePoint[] = (data.data ?? [])
          .filter((r: { lat: number | null; lng: number | null }) => r.lat != null && r.lng != null)
          .map((r: { id: string; title: string; locationType: string | null; activityType: string | null; lat: number; lng: number; description: string; volcanoStatus?: string | null; geometry?: MapMarkerGeometry | null }) => ({
            id:           r.id,
            title:         r.title,
            locationType:  r.locationType ?? 'other',
            activityType:  r.activityType ?? null,
            lat:           r.lat,
            lng:           r.lng,
            description:   r.description ?? '',
            volcanoStatus: r.volcanoStatus ?? null,
            geometry:      r.geometry ?? null,
          }));
        setAllRoutes(points);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = activeFilter === 'all'
    ? allRoutes
    : activeFilter.startsWith('activity:')
      ? allRoutes.filter(r => r.activityType === activeFilter.slice(9))
      : allRoutes.filter(r => r.locationType === activeFilter);

  const countFor = (id: string) => {
    if (id === 'all') return allRoutes.length;
    if (id.startsWith('activity:')) return allRoutes.filter(r => r.activityType === id.slice(9)).length;
    return allRoutes.filter(r => r.locationType === id).length;
  };

  const mapMarkers = filtered.map(r => {
    const cfg = LOCATION_TYPE_CONFIG[r.locationType ?? 'other'] ?? LOCATION_TYPE_CONFIG.other;
    const baseColor = r.locationType === 'volcano' && r.volcanoStatus
      ? (VOLCANO_STATUS_COLOR[r.volcanoStatus] ?? cfg.color)
      : cfg.color;
    const color = (activeFilter === 'activity:esoteric' && r.activityType === 'esoteric')
      ? 'purple'
      : baseColor;
    return {
      id:          r.id,
      coords:      [r.lat, r.lng] as [number, number],
      title:       r.title,
      description: r.description.slice(0, 100),
      color,
      href:        `/routes/${r.id}`,
      type:        MarkerType.TOUR,
      category:    r.locationType ?? 'other',
      geometry:    r.geometry ?? undefined,
    };
  });

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Logo size={28} />
          </Link>
          <h1 className="text-lg font-bold text-[var(--text-primary)] hidden sm:block"
              style={{ fontFamily: 'var(--font-playfair)' }}>
            Карта Камчатки
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Переключить тему">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link href="/profile" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Личный кабинет">
              <User size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Фильтры по типу локации (ГДЕ) */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex flex-wrap gap-2">
          {LOCATION_FILTERS.map(f => {
            const cnt = countFor(f.id);
            if (f.id !== 'all' && cnt === 0) return null;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === f.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]'
                }`}
              >
                {f.label}
                <span className={`ml-1 text-xs ${activeFilter === f.id ? 'opacity-70' : 'text-[var(--text-muted)]'}`}>
                  {loading ? '…' : cnt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Карта */}
      <div className="px-4 pb-4">
        <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
          <LeafletMap
            center={[53.0444, 158.6483]}
            zoom={7}
            markers={mapMarkers}
            height="calc(100vh - 180px)"
            attribution={false}
            onMarkerClick={handleMarkerClick}
          />

          {/* Счётчик */}
          <div className="absolute bottom-3 left-3 z-40 bg-[var(--bg-card)] rounded-lg px-3 py-1.5 border border-[var(--border)] shadow-sm">
            <p className="text-sm text-[var(--text-secondary)]">
              {loading
                ? 'Загрузка...'
                : <>Точек: <span className="font-bold text-[var(--accent)]">{filtered.length}</span></>
              }
            </p>
          </div>
        </div>
      </div>

      {/* ── Панель маршрута ─────────────────────────────────────────────── */}
      {selectedRoute && (
        <div
          className="fixed bottom-[5.5rem] left-2 right-2 rounded-xl md:bottom-4 md:right-4 md:left-auto md:w-96 z-[110]
            bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl"
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          <div className="p-4">
            {/* Шапка */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                    {LOCATION_TYPE_CONFIG[selectedRoute.locationType ?? 'other']?.label ?? 'Маршрут'}
                  </span>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] leading-snug"
                    style={{ fontFamily: 'var(--font-playfair)' }}>
                  {selectedRoute.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Описание */}
            {selectedRoute.description && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4 mb-4">
                {selectedRoute.description.split('\n')[0]}
              </p>
            )}

            {/* Кнопка */}
            <Link
              href={`/routes/${selectedRoute.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg
                bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Открыть маршрут
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      <BottomNav activePath="/map" />
      <AssistantButton pageContext={{ type: 'map' }} />
    </div>
  );
}
