'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { Filter, X } from 'lucide-react';
import { MarkerType, type MapMarker } from '@/components/shared/LeafletMap';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

type KindValue = 'place' | 'route' | 'tour';

const KIND_TABS: { value: KindValue; label: string }[] = [
  { value: 'place', label: 'Места' },
  { value: 'route', label: 'Маршруты' },
  { value: 'tour', label: 'Туры' },
];

const FILTER_OPTIONS: Record<KindValue, { id: string; label: string; queryField: string }[]> = {
  place: [
    { id: 'volcano', label: 'Вулканы', queryField: 'location_type' },
    { id: 'hot_spring', label: 'Источники', queryField: 'location_type' },
    { id: 'bay', label: 'Океан', queryField: 'location_type' },
    { id: 'lake', label: 'Озёра', queryField: 'location_type' },
    { id: 'waterfall', label: 'Водопады', queryField: 'location_type' },
    { id: 'geyser', label: 'Гейзеры', queryField: 'location_type' },
  ],
  route: [
    { id: 'trekking', label: 'Пешие', queryField: 'activity_type' },
    { id: 'dzhip', label: 'Джип', queryField: 'activity_type' },
    { id: 'boat_trip', label: 'Водные', queryField: 'activity_type' },
    { id: 'helicopter', label: 'Вертолёт', queryField: 'activity_type' },
    { id: 'snowmobile', label: 'Снегоход', queryField: 'activity_type' },
  ],
  tour: [
    { id: 'vulkani', label: 'Вулканы', queryField: 'category' },
    { id: 'rybalka', label: 'Рыбалка', queryField: 'category' },
    { id: 'medvedi', label: 'Медведи', queryField: 'category' },
    { id: 'vertoletnye_tury', label: 'Вертолёты', queryField: 'category' },
    { id: 'termalnye_istochniki', label: 'Источники', queryField: 'category' },
  ],
};

const COLOR_MAP: Record<string, string> = {
  volcano: 'orange',
  hot_spring: 'red',
  bay: 'darkCyan',
  lake: 'lightBlue',
  mountain: 'darkBlue',
  river: 'teal',
  geyser: 'green',
  waterfall: 'blue',
  viewpoint: 'cyan',
  rock: 'brown',
  island: 'purple',
  beach: 'orange',
  forest: 'darkGreen',
  other: 'gray',
};

interface RoutePoint {
  id: string;
  title: string;
  kind: string;
  locationType: string | null;
  activityType: string | null;
  category: string | null;
  difficulty: string | null;
  lat: number;
  lng: number;
  description: string;
}

export function HomeMapPreview() {
  const [kind, setKind] = useState<KindValue>('place');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filteredRoutes, setFilteredRoutes] = useState<RoutePoint[]>([]);
  const [allRoutes, setAllRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveFilter(null);
    setLoading(true);
    fetch(`/api/routes?hasCoords=true&limit=500&sort=title&kind=${kind}`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => {
        const points = (d.data ?? [])
          .filter((r: { lat: number | null; lng: number | null }) => r.lat != null && r.lng != null)
          .map((r: {
            id: string; title: string; kind: string; locationType: string | null;
            activityType: string | null; category: string | null; difficulty: string | null;
            description: string; lat: number; lng: number;
          }) => ({
            id: r.id,
            title: r.title,
            kind: r.kind,
            locationType: r.locationType ?? null,
            activityType: r.activityType ?? null,
            category: r.category ?? null,
            difficulty: r.difficulty ?? null,
            description: (r.description ?? '').replace(/<[^>]+>/g, '').slice(0, 120),
            lat: r.lat,
            lng: r.lng,
          }));
        setAllRoutes(points);
        setFilteredRoutes(points);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kind]);

  const currentOptions = FILTER_OPTIONS[kind] ?? FILTER_OPTIONS.place;

  const applyFilter = useCallback((filterId: string) => {
    if (!filterId) { setFilteredRoutes(allRoutes); return; }
    const opt = currentOptions.find(o => o.id === filterId);
    if (!opt) { setFilteredRoutes(allRoutes); return; }
    const field = opt.queryField ?? 'location_type';
    const filtered = allRoutes.filter(r => {
      const val = field === 'location_type' ? r.locationType
        : field === 'activity_type' ? r.activityType
        : field === 'category' ? r.category
        : r.locationType;
      // Fallback: если locationType null, пробуем activityType/category
      if (val === filterId) return true;
      if (field === 'location_type' && !r.locationType) {
        return r.activityType === filterId || r.category === filterId;
      }
      return false;
    });
    setFilteredRoutes(filtered);
  }, [allRoutes, currentOptions]);

  const handleFilterClick = useCallback((id: string) => {
    setActiveFilter(prev => {
      const next = prev === id ? null : id;
      applyFilter(next ?? '');
      return next;
    });
  }, [applyFilter]);

  const markers: MapMarker[] = useMemo(() => filteredRoutes.map(r => {
    // Если locationType null, используем activityType/category как fallback для любого kind
    const locType = r.locationType
      || r.activityType
      || r.category
      || 'other';
    return {
      id: r.id,
      coords: [r.lat, r.lng] as [number, number],
      title: r.title,
      description: r.description,
      color: COLOR_MAP[locType] ?? 'gray',
      category: locType,
      href: `/routes/${r.id}`,
      type: MarkerType.POI,
    };
  }), [filteredRoutes, kind]);

  return (
    <div className="relative h-full min-h-[400px]">
      {/* LeafletMap — на заднем плане */}
      <LeafletMap
        center={[53.0, 158.7]}
        zoom={7}
        markers={markers}
        height="100%"
        attribution={false}
      />

      {/* Kind tabs — overlay top-left — inline zIndex чтобы перебить Leaflet tile pane (z-400 !important) */}
      <div className="absolute top-3 left-3 flex gap-1.5" style={{ zIndex: 9999 }}>
        {KIND_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setKind(t.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all backdrop-blur-md ${
              kind === t.value
                ? 'bg-[var(--accent)] text-white shadow-lg'
                : 'bg-[var(--bg-card)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/80" style={{ zIndex: 9999 }}>
          <div className="text-sm text-[var(--text-muted)] animate-pulse">Загрузка карты…</div>
        </div>
      )}

      {/* Filter chips — overlay bottom — inline zIndex чтобы перебить Leaflet tile pane (z-400 !important) */}
      <div className="absolute bottom-3 left-3 right-3" style={{ zIndex: 9999 }}>
        <div className="rounded-xl bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border)]/50 shadow-xl px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
            {currentOptions.map(f => (
              <button
                key={f.id}
                onClick={() => handleFilterClick(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeFilter === f.id
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'bg-[var(--bg-primary)]/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]/30'
                }`}
              >
                {f.label}
              </button>
            ))}
            {activeFilter && (
              <button
                onClick={() => { setActiveFilter(null); setFilteredRoutes(allRoutes); }}
                className="flex-shrink-0 p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[10px] text-[var(--text-muted)] ml-auto flex-shrink-0">
              {loading ? '…' : filteredRoutes.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
